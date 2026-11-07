import { createClient } from '@supabase/supabase-js';

function normalizeUgandaPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  let normalized = '';
  if (digits.startsWith('0') && digits.length === 10) normalized = `256${digits.slice(1)}`;
  else if (digits.startsWith('256') && digits.length === 12) normalized = digits;
  else throw new Error('Enter a valid Uganda phone number.');
  return `+${normalized}`;
}

function getProvider(provider) {
  const n = String(provider || '').trim().toLowerCase();
  if (n === 'mtn') return 'mtn';
  if (n === 'airtel') return 'airtel';
  throw new Error('Choose MTN or Airtel.');
}

async function readJson(response) {
  try { return await response.json(); } catch { return null; }
}

export default async function handler(req, res) {
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

  let phoneNumber, providerValue;
  try {
    phoneNumber = normalizeUgandaPhone(phone);
    providerValue = getProvider(provider);
  } catch (error) {
    return res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid payment details.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const paymentsUrl = 'https://payments.pesajet.com/api/v1/payments';

  try {
    const { error: insertError } = await supabase.from('pesajet_transactions').insert({
      order_id: String(reference),
      user_id: String(user_id),
      amount: paymentAmount,
      phone: phoneNumber,
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
      phone: phoneNumber,
      phone_number: phoneNumber,
      amount: paymentAmount,
      payment_method: providerValue,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // EXACT format from PesaJet docs
    const providerResponse = await fetch(paymentsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        amount: paymentAmount,
        currency: 'UGX',
        provider: providerValue,
        phoneNumber: phoneNumber,
      }),
    });

    const providerData = await readJson(providerResponse);

    if (!providerResponse.ok) {
      await supabase.from('pesajet_transactions').update({ status: 'failed' }).eq('order_id', String(reference));
      await supabase.from('recharge_orders').update({ status: 'failed' }).eq('id', String(reference));
      console.error('PesaJet rejected:', { status: providerResponse.status, response: providerData });
      return res.status(502).json({ success: false, error: providerData?.message || providerData?.error || `PesaJet rejected the request (${providerResponse.status}).` });
    }

    const transactionId =
      providerData?.id ||
      providerData?.transaction_id ||
      providerData?.data?.id ||
      providerData?.data?.transaction_id ||
      providerData?.data?.reference ||
      providerData?.reference ||
      String(reference);

    await supabase.from('pesajet_transactions').update({ pesajet_id: String(transactionId) }).eq('order_id', String(reference));

    return res.status(200).json({
      success: true,
      status: 'accepted',
      reference: String(reference),
      transaction_id: String(transactionId),
      message: 'PesaJet accepted the payment request.',
    });
  } catch (error) {
    console.error('PesaJet handler error:', error instanceof Error ? error.message : 'Unknown');
    await supabase.from('pesajet_transactions').update({ status: 'failed' }).eq('order_id', String(reference));
    await supabase.from('recharge_orders').update({ status: 'failed' }).eq('id', String(reference));
    return res.status(502).json({ success: false, error: 'Could not contact the payment provider.' });
  }
    }
