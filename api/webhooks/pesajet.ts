import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let body = req.body;
    if (!body || Object.keys(body).length === 0) {
      const chunks: any[] = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      try { body = JSON.parse(raw); } catch { body = {}; }
    }

    console.log('Webhook received:', JSON.stringify(body));

    const reference = body?.reference || body?.Reference || body?.transaction_reference || body?.data?.reference;
    const rawStatus = (body?.status || body?.Status || body?.transaction_status || body?.data?.status || '').toString().toUpperCase();

    if (!reference) {
      console.log('No reference in webhook');
      return res.status(200).json({ ok: true });
    }

    const SUCCESS_STATUSES = ['SUCCESSFUL','SUCCESS','COMPLETED','COMPLETE','APPROVED'];
    if (!SUCCESS_STATUSES.includes(rawStatus)) {
      console.log(`Ignoring status ${rawStatus} for ${reference}`);
      return res.status(200).json({ ok: true });
    }

    const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supaUrl || !supaKey) {
      console.error('Missing Supabase env');
      return res.status(200).json({ ok: true });
    }

    const supabase = createClient(supaUrl, supaKey);

    // 1. Get recharge
    const { data: recharge } = await supabase
      .from('recharges')
      .select('*')
      .eq('reference', reference)
      .single();

    if (!recharge) {
      console.log('Recharge not found:', reference);
      return res.status(200).json({ ok: true });
    }

    if (recharge.status === 'completed') {
      return res.status(200).json({ ok: true, msg: 'already completed' });
    }

    // 2. Mark completed
    await supabase.from('recharges').update({ status: 'completed' }).eq('reference', reference);
    console.log('✅ Marked completed:', reference);

    // 3. Add balance if user_id exists
    if (recharge.user_id && recharge.amount) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', recharge.user_id)
        .single();

      if (profile) {
        const newBal = Number(profile.balance || 0) + Number(recharge.amount);
        await supabase.from('profiles').update({ balance: newBal }).eq('id', recharge.user_id);
        console.log(`✅ Balance: ${profile.balance} -> ${newBal} for ${recharge.user_id}`);
      }
    }

    return res.status(200).json({ ok: true, completed: reference });

  } catch (e: any) {
    console.error('Webhook error:', e);
    return res.status(200).json({ ok: true }); // Always 200 so PesaJet doesn't retry
  }
      }
