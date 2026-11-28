import { createClient } from '@supabase/supabase-js';

function normalizeUgandaPhone(value: any) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `256${digits.slice(1)}`;
  if (digits.startsWith('256') && digits.length === 12) return digits;
  throw new Error('Enter a valid Uganda phone number.');
}

function getProvider(provider: any, phone: any) {
  // Auto-detect from number - 075/070 = airtel, 077/078/076 = mtn
  const digits = String(phone || '').replace(/\D/g, '');
  const prefix = digits.startsWith('256') ? digits.slice(3, 5) : digits.slice(0, 2);
  if (['75', '70'].includes(prefix)) return 'airtel';
  if (['77', '78', '76'].includes(prefix)) return 'mtn';
  const n = String(provider || '').trim().toLowerCase();
  if (n === 'mtn' || n === 'airtel') return n;
  throw new Error('Choose MTN or Airtel.');
}

async function readJson(response: any) {
  try { return await response.json(); } catch { return null; }
}

function getTransactionId(data: any) {
  if (!data || typeof data !== 'object') return null;
  const candidates = [
    data.id,
    data.transaction_id,
    data.transactionId,
    data.payment_id,
    data.paymentId,
    data.tx_ref,
    data?.data?.id,
    data?.data?.transaction_id,
    data?.data?.transactionId,
    data?.data?.payment_id,
    data?.data?.data?.id,
    data?.data?.transaction?.id,
    data?.data?.reference,
    data?.reference,
  ];
  for (const c of candidates) if (c) return String(c);
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { amount, phone, provider, reference, user_id } = req.body || {};
  const paymentAmount = Number(amount);

  if (!Number.isFinite(paymentAmount) || paymentAmount < 30000 || paymentAmount > 1500000) {
    return res.status(400).json({ success: false, error: 'Amount must be between UGX 30,000 and UGX 1,500,000.' });
  }
  if (!reference || !user_id) {
    return res.status(400).json({ success: false, error: 'Missing payment reference or user ID.' });
  }

  const apiKey = process.env.PESAJET_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) return res.status(500).json({ success: false, error: 'PesaJet API key is not configured on the server.' });
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ success: false, error: 'Supabase server credentials are not configured.' });

  let normalizedPhone: string;
  let providerValue: string;
  try {
    normalizedPhone = normalizeUgandaPhone(phone);
    providerValue = getProvider(provider, phone);
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid payment details.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const paymentsUrl = 'https://payments.pesajet.com/api/v1/payments';

  try {
    // Write to ALL 3 tables so every frontend page finds it
    const { error: insertError } = await supabase.from('pesajet_transactions').insert({
      order_id: String(reference),
      user_id: String(user_id),
      amount: paymentAmount,
      phone: normalizedPhone,
      network: providerValue.toUpperCase(),
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    if (insertError) {
      console.error('pesajet_transactions insert:', insertError.message);
      return res.status(500).json({ success: false, error: 'Could not create the payment record: ' + insertError.message });
    }

    await supabase.from('recharge_orders').insert({
      id: String(reference),
      user_id: String(user_id),
      phone: normalizedPhone,
      phone_number: `+${normalizedPhone}`,
      amount: paymentAmount,
      payment_method: providerValue,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // THIS is the table your Status page reads from
    await supabase.from('investment_packages').insert({
      id: String(reference),
      user_id: String(user_id),
      amount: paymentAmount,
      product_name: 'RECHARGE',
      status: 'pending',
      payment_method: providerValue,
      phone_number: `+${normalizedPhone}`,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    console.log('Sending to PesaJet:', { amount: paymentAmount, provider: providerValue, phone: normalizedPhone, reference });

    // FIXED: Correct PesaJet format - X-API-Key + ONLY 5 fields
    const providerResponse = await fetch(paymentsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        amount: paymentAmount,
        currency: 'UGX',
        provider: providerValue,
        phoneNumber: normalizedPhone,
        reference: String(reference),
      }),
    });

    const providerData = await readJson(providerResponse);
    console.log('PesaJet raw response:', providerResponse.status, JSON.stringify(providerData));

    if (!providerResponse.ok) {
      await supabase.from('pesajet_transactions').update({ status: 'failed' }).eq('order_id', String(reference));
      await supabase.from('recharge_orders').update({ status: 'failed' }).eq('id', String(reference));
      await supabase.from('investment_packages').update({ status: 'failed' }).eq('id', String(reference));
      console.error('PesaJet rejected:', { status: providerResponse.status, response: providerData });
      return res.status(502).json({ success: false, error: providerData?.message || providerData?.error || `PesaJet rejected the request (${providerResponse.status}).` });
    }

    const transactionId = getTransactionId(providerData);
    if (!transactionId) {
      console.error('PesaJet response had no transaction ID. Full response:', JSON.stringify(providerData));
      await supabase.from('pesajet_transactions').update({ status: 'failed' }).eq('order_id', String(reference));
      await supabase.from('recharge_orders').update({ status: 'failed' }).eq('id', String(reference));
      await supabase.from('investment_packages').update({ status: 'failed' }).eq('id', String(reference));
      return res.status(502).json({ success: false, reference, error: 'The provider response could not be confirmed. Check order status before retrying.' });
    }

    await supabase.from('pesajet_transactions').update({ pesajet_id: String(transactionId) }).eq('order_id', String(reference));
    await supabase.from('investment_packages').update({ pesajet_id: String(transactionId) }).eq('id', String(reference));

    console.log('PesaJet accepted:', { reference, transactionId, provider: providerValue });

    return res.status(200).json({
      success: true,
      status: 'accepted',
      reference: String(reference),
      transaction_id: String(transactionId),
      message: 'PesaJet accepted the payment request.',
    });
  } catch (error: any) {
    console.error('PesaJet handler error:', error instanceof Error ? error.message : 'Unknown');
    await supabase.from('pesajet_transactions').update({ status: 'failed' }).eq('order_id', String(reference));
    await supabase.from('recharge_orders').update({ status: 'failed' }).eq('id', String(reference));
    await supabase.from('investment_packages').update({ status: 'failed' }).eq('id', String(reference));
    return res.status(502).json({ success: false, error: 'Could not contact the payment provider.' });
  }
                                            }
