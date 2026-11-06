import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  // 1. ALWAYS return 200 fast - PesaJet only cares about 2xx
  // Even if we fail later, we must not return 401/500 or PesaJet pauses us
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'PesaJet callback alive' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
    );

    const body = req.body || {};
    console.log('PesaJet webhook:', JSON.stringify(body));

    // PesaJet sends many different shapes - handle ALL of them
    const orderId = body.order_id || body.orderId || body.reference || body.external_reference || body.metadata?.order_id || body.data?.order_id;
    const statusRaw = String(body.status || body.payment_status || body.state || body.data?.status || '').toLowerCase();
    const amount = Number(body.amount || body.data?.amount || 0);
    const phone = body.phone || body.phone_number || body.msisdn || body.data?.phone;

    const isSuccess = ['success', 'successful', 'completed', 'paid', 'approved', 'confirmed'].includes(statusRaw);

    if (!orderId) {
      // No order id - still return 200 so PesaJet doesn't pause us
      return res.status(200).json({ ok: true, message: 'No order_id, ignored' });
    }

    // Find order
    const { data: order } = await supabase
      .from('recharge_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) {
      return res.status(200).json({ ok: true, message: 'Order not found' });
    }

    // Already approved? Don't double-credit
    if ((order as any).status === 'approved' || (order as any).status === 'completed') {
      return res.status(200).json({ ok: true, message: 'Already processed' });
    }

    if (isSuccess) {
      // 1. Mark order approved
      await supabase.from('recharge_orders').update({ status: 'approved' }).eq('id', orderId);

      // 2. Credit user - ONCE
      const userId = (order as any).user_id;
      const creditAmount = Number((order as any).amount || amount);
      const { data: user } = await supabase.from('users').select('balance').eq('id', userId).maybeSingle();
      const newBal = Number((user as any)?.balance || 0) + creditAmount;
      await supabase.from('users').update({ balance: newBal }).eq('id', userId);

      console.log(`Credited ${creditAmount} to ${userId}, new balance ${newBal}`);
    } else if (statusRaw === 'failed' || statusRaw === 'cancelled' || statusRaw === 'rejected') {
      await supabase.from('recharge_orders').update({ status: 'failed' }).eq('id', orderId);
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Callback error:', e);
    // STILL return 200 - never let PesaJet pause us!
    return res.status(200).json({ ok: true, error: e.message });
  }
}
