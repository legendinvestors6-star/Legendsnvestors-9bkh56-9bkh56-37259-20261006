import { createClient } from '@supabase/supabase-js';

function normalizeUgandaPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return `+256${digits.slice(1)}`;
  }
  if (digits.startsWith('256') && digits.length === 12) {
    return `+${digits}`;
  }
  throw new Error('Enter a valid Uganda phone number.');
}

function getProvider(value) {
  const provider = String(value || '').trim().toLowerCase();
  if (provider === 'mtn' || provider === 'airtel') {
    return provider;
  }
  throw new Error('Choose MTN or Airtel.');
}

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getTransactionId(data, fallback) {
  const id =
    data?.id ||
    data?.transaction_id ||
    data?.data?.id ||
    data?.data?.transaction_id ||
    data?.data?.reference ||
    data?.reference ||
    fallback;
  return id ? String(id) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { amount, phone, provider, reference, user_id: requestedUserId } = req.body || {};
  const paymentAmount = Number(amount);

  if (!Number.isSafeInteger(paymentAmount) || paymentAmount < 30000 || paymentAmount > 1500000) {
    return res.status(400).json({ success: false, error: 'Amount must be between UGX 30,000 and UGX 1,500,000.' });
  }

  if (typeof reference !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(reference) || !requestedUserId) {
    return res.status(400).json({ success: false, error: 'Missing or invalid payment reference or user ID.' });
  }

  const apiKey = process.env.PESAJET_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'PesaJet API key is not configured on the server.' });
  }
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return res.status(500).json({ success: false, error: 'Supabase server credentials are not configured.' });
  }

  const accessToken = readBearerToken(req);
  if (!accessToken) {
    return res.status(401).json({ success: false, error: 'Sign in with Supabase Auth before starting a recharge.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user: authenticatedUser }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authenticatedUser) {
    return res.status(401).json({ success: false, error: 'Your login session is invalid or expired.' });
  }
  if (authenticatedUser.id !== String(requestedUserId)) {
    return res.status(403).json({ success: false, error: 'You cannot create a recharge for another user.' });
  }

  let phoneNumber;
  let providerValue;
  try {
    phoneNumber = normalizeUgandaPhone(phone);
    providerValue = getProvider(provider);
  } catch (error) {
    return res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid payment details.' });
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: insertError } = await db.from('investment_packages').insert({
    id: reference,
    user_id: authenticatedUser.id,
    amount: paymentAmount,
    product_name: 'RECHARGE',
    status: 'pending',
    payment_method: providerValue,
    phone_number: phoneNumber,
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('Could not create recharge order:', insertError.message);
    return res.status(409).json({ success: false, error: 'Could not create this recharge order. Refresh and try again.' });
  }

  try {
    const providerResponse = await fetch('https://payments.pesajet.com/api/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        amount: paymentAmount,
        currency: 'UGX',
        provider: providerValue,
        phoneNumber,
        reference,
      }),
    });

    const providerData = await readJson(providerResponse);

    if (!providerResponse.ok) {
      await db.from('investment_packages').update({ status: 'failed' }).eq('id', reference).eq('status', 'pending');
      console.error('PesaJet rejected payment request:', {
        status: providerResponse.status,
        message: providerData?.message || providerData?.error || 'No details',
      });
      return res.status(502).json({
        success: false,
        error: providerData?.message || providerData?.error || `PesaJet rejected the request (${providerResponse.status}).`,
      });
    }

    // FIXED: If PesaJet accepted but gave no ID, use reference - don't fail
    const transactionId = getTransactionId(providerData, reference);

    const { error: saveTransactionError } = await db
      .from('investment_packages')
      .update({ pesajet_id: transactionId })
      .eq('id', reference)
      .eq('status', 'pending');

    if (saveTransactionError) {
      console.error('Could not save provider transaction ID:', saveTransactionError.message);
    }

    return res.status(200).json({
      success: true,
      status: 'accepted',
      reference,
      transaction_id: transactionId,
      message: 'PesaJet accepted the payment request.',
    });
  } catch (error) {
    console.error('PesaJet request error:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(502).json({
      success: false,
      reference,
      error: 'The payment request result is uncertain. Check recharge status before retrying.',
    });
  }
}
