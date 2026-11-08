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

async function readJson(response) {
  try { return await response.json(); } catch { return null; }
}

function getTransactionId(data) {
  const id = data?.id || data?.transaction_id || data?.data?.id || data?.data?.transaction_id;
  return id ? String(id) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { amount, phone, phone_number, provider, reference, user_id: requestedUserId } = req.body || {};
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

  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'PesaJet API key is not configured on the server.' });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ success: false, error: 'Supabase server credentials are not configured.' });
  }

  // FIX: NO Supabase Auth - your app uses custom login (users table, id = text, phone column)
  // We verify user exists in YOUR users table using service_role, not auth.getUser()
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingUser, error: userError } = await db
    .from('users')
    .select('id, phone')
    .eq('id', String(requestedUserId))
    .maybeSingle();

  if (userError) {
    console.error('User lookup failed:', userError.message);
    return res.status(500).json({ success: false, error: 'Could not verify user. Try again.' });
  }
  if (!existingUser) {
    return res.status(404).json({ success: false, error: 'User not found. Please log in again.' });
  }

  let phoneNumber;
  let providerValue;
  try {
    phoneNumber = normalizeUgandaPhone(phone || phone_number);
    providerValue = getProvider(provider);
  } catch (error) {
    return res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid payment details.' });
  }

  // Use the same table and reference used by the webhook and admin page.
  const { error: insertError } = await db
    .from('investment_packages')
    .insert({
      id: reference,
      user_id: String(requestedUserId),
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
    const providerResponse = await fetch(
      'https://payments.pesajet.com/api/v1/payments',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          amount: paymentAmount,
          currency: 'UGX',
          provider: providerValue,
          phoneNumber,
          reference,
        }),
      }
    );

    const providerData = await readJson(providerResponse);

    if (!providerResponse.ok) {
      await db.from('investment_packages').update({ status: 'failed' }).eq('id', reference).eq('status', 'pending');
      console.error('PesaJet rejected payment request:', { status: providerResponse.status, message: providerData?.message || providerData?.error || 'No details' });
      return res.status(502).json({ success: false, error: providerData?.message || providerData?.error || `PesaJet rejected the request (${providerResponse.status}).` });
    }

    const transactionId = getTransactionId(providerData);
    if (!transactionId) {
      console.error('PesaJet response had no transaction ID.');
      return res.status(502).json({ success: false, reference, error: 'The provider response could not be confirmed. Check order status before retrying.' });
    }

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
    return res.status(502).json({ success: false, reference, error: 'The payment request result is uncertain. Check recharge status before retrying.' });
  }
                        }
