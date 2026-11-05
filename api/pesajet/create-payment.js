import { createClient } from '@supabase/supabase-js';

function normalizeUgandaPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');

  // Convert local Ugandan format (07XXXXXXXX or 03XXXXXXXX) to country code.
  if (digits.startsWith('0') && digits.length === 10) {
    return `256${digits.slice(1)}`;
  }

  // Accept country-code format with or without a leading plus.
  if (digits.startsWith('256') && digits.length === 12) {
    return digits;
  }

  throw new Error('Enter a valid Uganda phone number.');
}

function getNetwork(provider) {
  const normalized = String(provider || '').trim().toLowerCase();

  if (normalized === 'mtn') return 'MTN';
  if (normalized === 'airtel') return 'AIRTEL';

  throw new Error('Choose MTN or Airtel.');
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    amount,
    phone,
    provider,
    reference,
    user_id,
  } = req.body || {};

  const paymentAmount = Number(amount);

  if (!Number.isFinite(paymentAmount) || paymentAmount < 30000 || paymentAmount > 1500000) {
    return res.status(400).json({
      success: false,
      error: 'Amount must be between UGX 30,000 and UGX 1,500,000.',
    });
  }

  if (!reference || !user_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing payment reference or user ID.',
    });
  }

  const apiKey = process.env.PESAJET_API_KEY;
  const merchantId = process.env.PESAJET_MERCHANT_ID;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!apiKey || !merchantId) {
    return res.status(500).json({
      success: false,
      error: 'PesaJet credentials are not configured on the server.',
    });
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({
      success: false,
      error: 'Supabase server credentials are not configured.',
    });
  }

  if (!appBaseUrl) {
    return res.status(500).json({
      success: false,
      error: 'APP_BASE_URL is not configured on the server.',
    });
  }

  let normalizedPhone;
  let network;

  try {
    normalizedPhone = normalizeUgandaPhone(phone);
    network = getNetwork(provider);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid payment details.',
    });
  }

  const callbackUrl = `${appBaseUrl.replace(/\/$/, '')}/api/pesajet/webhook`;

  try {
    const pesajetResponse = await fetch('https://api.pesajet.com/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Merchant-ID': merchantId,
      },
      body: JSON.stringify({
        amount: paymentAmount,
        phone: normalizedPhone,
        network,
        reference: String(reference),
        callback_url: callbackUrl,
        description: `Legend Recharge UGX ${paymentAmount}`,
      }),
    });

    const providerData = await readJson(pesajetResponse);

    if (!pesajetResponse.ok) {
      console.error('PesaJet payment request failed:', {
        status: pesajetResponse.status,
        response: providerData,
      });

      return res.status(502).json({
        success: false,
        error:
          providerData?.message ||
          providerData?.error ||
          `PesaJet rejected the request (${pesajetResponse.status}).`,
      });
    }

    const transactionId =
      providerData?.id ||
      providerData?.transaction_id ||
      providerData?.data?.id ||
      providerData?.data?.transaction_id;

    if (!transactionId) {
      console.error('PesaJet response did not include a transaction ID:', providerData);

      return res.status(502).json({
        success: false,
        error: 'PesaJet response did not include a transaction ID.',
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { error: saveError } = await supabase
      .from('pesajet_transactions')
      .insert({
        order_id: String(reference),
        user_id: String(user_id),
        amount: paymentAmount,
        phone: normalizedPhone,
        network,
        pesajet_id: String(transactionId),
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (saveError) {
      // Log this for reconciliation. The provider may already have accepted
      // the request, so do not encourage an immediate duplicate payment retry.
      console.error('Could not save PesaJet transaction:', saveError);
    }

    return res.status(200).json({
      success: true,
      status: 'accepted',
      transaction_id: String(transactionId),
      message: 'Payment request accepted by the provider.',
    });
  } catch (error) {
    console.error('PesaJet payment handler error:', error);

    return res.status(502).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Could not contact the payment provider.',
    });
  }
}
