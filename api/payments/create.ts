import { createClient } from '@supabase/supabase-js';

function normalizeUgandaPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `256${digits.slice(1)}`;
  if (digits.startsWith('256') && digits.length === 12) return digits;
  throw new Error('Enter a valid Uganda phone number.');
}

function getNetwork(provider) {
  const n = String(provider || '').trim().toLowerCase();
  if (n === 'mtn') return 'MTN';
  if (n === 'airtel') return 'AIRTEL';
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
  const appBaseUrl = process.env.APP_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  if (!apiKey) return res.status(500).json({ success: false, error: 'PesaJet API key is not configured on the server.' });
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ success: false, error: 'Supabase server credentials are not configured.' });
  if (!appBaseUrl) return res.status(500).json({ success: false, error: 'Set APP_BASE_URL to your deployed site URL.' });

  let normalizedPhone, network;
  try {
    normalizedPhone = normalizeUgandaPhone(phone);
    network = getNetwork(provider);
  } catch (error) {
    return res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid payment details.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const callbackUrl = `${appBaseUrl.replace(/\/$/, '')}/api/pesajet-callback`;
  const paymentsUrl = 'https://payments.pesajet.com/api/v1/payments/TRANSACTION_ID';

  try {
    // FIX 1: Write to BOTH tables so frontend polling works
    const { error: insertError } = await supabase.from('pesajet_transactions').insert({
      order_id: String(reference),
      user_id: String(user_id),
      amount: paymentAmount,
      phone: normalizedPhone,
      network,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    if (insertError) {
      console.error('pesajet_transactions insert:', insertError.message);
      return res.status(500).json({ success: false, error: 'Could not create the payment record: ' + insertError.message });
    }

    // ALSO write to recharge_orders - ignore duplicate error
    await supabase.from('recharge_orders').insert({
      id: String(reference),
      user_id: String(user_id),
      phone: normalizedPhone,
      phone_number: normalizedPhone,
      amount: paymentAmount,
      payment_method: network.toLowerCase(),
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    const providerResponse = await fetch(paymentsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        amount: paymentAmount,
        phone: normalizedPhone,
        network,
        reference: String(reference),
        callback_url: callbackUrl,
        description: `Legend Recharge UGX ${paymentAmount}`,
      }),
    });

    const providerData = await readJson(providerResponse);

    if (!providerResponse.ok) {
      await supabase.from('pesajet_transactions').update({ status: 'failed' }).eq('order_id', String(reference));
      await supabase.from('recharge_orders').update({ status: 'failed' }).eq('id', String(reference));
      console.error('PesaJet rejected:', { status: providerResponse.status, response: providerData });
      return res.status(502).json({ success: false, error: providerData?.message || providerData?.error || `PesaJet rejected the request (${providerResponse.status}).` });
    }

    // FIX 2: Don't fail if PesaJet returns different ID field - accept ANY id
    const transactionId =
      providerData?.id ||
      providerData?.transaction_id ||
      providerData?.data?.id ||
      providerData?.data?.transaction_id ||
      providerData?.data?.reference ||
      providerData?.reference ||
      String(reference); // fallback to our reference - DON'T 502

    const { error: updateError } = await supabase.from('pesajet_transactions').update({ pesajet_id: String(transactionId) }).eq('order_id', String(reference));
    if (updateError) console.error('Could not save PesaJet ID:', updateError.message);

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
 
