import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Signature verification requires the exact, unparsed request body.
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function isValidSignature(rawBody, suppliedSignature, secret) {
  if (!suppliedSignature || !secret) return false;

  // Assumes PesaJet sends a hex SHA-256 HMAC, optionally prefixed "sha256=".
  const signature = String(suppliedSignature)
    .trim()
    .replace(/^sha256=/i, '');

  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest();

  const received = Buffer.from(signature, 'hex');

  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

function getPaymentStatus(payload) {
  const event = String(
    payload?.event ||
    payload?.type ||
    payload?.data?.event ||
    ''
  ).toLowerCase();

  const status = String(
    payload?.status ||
    payload?.payment_status ||
    payload?.state ||
    payload?.data?.status ||
    payload?.data?.payment_status ||
    payload?.data?.state ||
    ''
  ).toLowerCase();

  if (
    ['payment.completed', 'payment.success', 'payment.succeeded'].includes(event) ||
    ['success', 'successful', 'completed', 'paid', 'approved', 'confirmed'].includes(status)
  ) {
    return 'success';
  }

  if (
    ['payment.failed', 'payment.cancelled', 'payment.canceled'].includes(event) ||
    ['failed', 'cancelled', 'canceled', 'rejected'].includes(status)
  ) {
    return 'failed';
  }

  return 'pending';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const webhookSecret = process.env.PESAJET_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('Webhook server configuration is incomplete.');
    return res.status(500).json({ ok: false, error: 'Webhook is not configured' });
  }

  let rawBody;

  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    console.error('Could not read webhook request body.');
    return res.status(400).json({ ok: false, error: 'Could not read request body' });
  }

  const signature = getHeader(req, 'x-webhook-signature');

  if (!isValidSignature(rawBody, signature, webhookSecret)) {
    return res.status(401).json({ ok: false, error: 'Invalid webhook signature' });
  }

  let payload;

  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
  }

  const payment = payload?.data ?? payload;
  const reference =
    payment?.reference ||
    payment?.order_id ||
    payment?.orderId ||
    payment?.external_reference ||
    payment?.metadata?.reference ||
    payment?.metadata?.order_id;

  if (!reference || typeof reference !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing payment reference' });
  }

  const paymentStatus = getPaymentStatus(payload);

  // Non-final notifications do not credit or change the order.
  if (paymentStatus === 'pending') {
    return res.status(200).json({ ok: true, message: 'Non-final callback received' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (paymentStatus === 'failed') {
    const { error } = await supabase
      .from('investment_packages')
      .update({ status: 'failed' })
      .eq('id', reference)
      .eq('product_name', 'RECHARGE')
      .eq('status', 'pending');

    if (error) {
      console.error('Could not record failed payment:', error.message);
      return res.status(500).json({ ok: false, error: 'Could not update recharge' });
    }

    return res.status(200).json({ ok: true, message: 'Failed payment recorded' });
  }

  const amount = Number(
    payment?.amount ??
    payment?.paid_amount ??
    payment?.data?.amount
  );

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid payment amount' });
  }

  // This database function must validate that the reference is a pending RECHARGE,
  // verify the exact amount, and credit platform_users.wallet_balance only once.
  const { error } = await supabase.rpc('complete_recharge', {
    p_order_id: reference,
    p_amount: amount,
  });

  if (error) {
    console.error('Could not process successful payment:', error.message);
    // Return a failure so the provider can retry if its webhook system supports retries.
    return res.status(500).json({ ok: false, error: 'Could not complete recharge' });
  }

  return res.status(200).json({ ok: true, message: 'Recharge processed' });
                              }
