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

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // === FIXED USER LOOKUP ===
  // Old code only tried exact ID -> failed for stale legend_user / duplicate accounts
  // New code: try ID first, then phone in ALL formats (+256..., 07..., 256...)
  let existingUser = null;

  const { data: byId, error: byIdError } = await db
    .from('users')
    .select('id, phone')
    .eq('id', String(requestedUserId))
    .maybeSingle();

  if (byIdError) {
    console.error('User lookup by ID failed:', byIdError.message);
    return res.status(500).json({ success: false, error: 'Could not verify user. Try again.' });
  }

  existingUser = byId;

  // Fallback by phone if ID didn't match
  if (!existingUser) {
    const rawPhone = String(phone || phone_number || '');
    const digits = rawPhone.replace(/\D/g, '');
    const candidates = new Set();

    if (digits.startsWith('0') && digits.length === 10) {
      candidates.add(rawPhone);
      candidates.add(digits);
      candidates.add(`+256${digits.slice(1)}`);
      candidates.add(`256${digits.slice(1)}`);
      candidates.add(`0${digits.slice(1)}`);
    } else if (digits.startsWith('256') && digits.length === 12) {
      candidates.add(`+${digits}`);
      candidates.add(digits);
      candidates.add(`0${digits.slice(3)}`);
    } else if (digits) {
      candidates.add(rawPhone);
      candidates.add(digits);
    }

    for (const p of candidates) {
      const { data: byPhone } = await db
        .from('users')
        .select('id, phone')
        .eq('phone', p)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byPhone) { existingUser = byPhone; break; }
    }
  }

  if (!existingUser) {
    console.error('User not found:', { requestedUserId, phone: phone || phone_number });
    return res.status(404).json({ success: false, error: 'User not found. Please log in again.' });
  }

  // Use the REAL ID from DB, not the stale frontend ID
  const finalUserId = String(existingUser.id);

  let phoneNumber;
  let providerValue;
  try {
    phoneNumber = normalizeUgandaPhone(phone || phone_number);
    providerValue = getProvider(provider);
  } catch (error) {
    return res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid payment details.' });
  }

  // Check if this reference already exists - don't create duplicate order
  const { data: existingOrder } = await db
    .from('investment_packages')
    .select('id, status')
    .eq('id', reference)
    .maybeSingle();

  if (existingOrder) {
    return res.status(200).json({
      success: true,
      status: 'accepted',
      reference,
      order_id: existingOrder.id,
      message: 'Payment request already exists.',
    });
  }

  const { error: insertError } = await db
    .from('investment_packages')
    .insert({
      id: reference,
      user_id: finalUserId,
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
      order_id: reference,
      transaction_id: transactionId,
      message: 'PesaJet accepted the payment request.',
    });
  } catch (error) {
    console.error('PesaJet request error:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(502).json({ success: false, reference, error: 'The payment request result is uncertain. Check recharge status before retrying.' });
  }
      }
