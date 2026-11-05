import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

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

function verifySignature(rawBody, suppliedSignature, secret) {
  if (!suppliedSignature || !secret) return false;

  const signature = String(suppliedSignature)
    .replace(/^sha256=/i, '')
    .trim();

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const webhookSecret = process.env.PESAJET_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('Missing PesaJet webhook or Supabase server environment variables');
    return res.status(500).json({ success: false, error: 'Webhook is not configured' });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['x-webhook-signature'];

    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    }

    const payment = payload?.data ?? payload;
    const event = String(payment?.event || '').toLowerCase();
    const status = String(payment?.status || '').toLowerCase();

    const isSuccessful =
      event === 'payment.completed' ||
      ['completed', 'success', 'successful', 'paid', 'approved'].includes(status);

    if (!isSuccessful) {
      // Ignore non-final events; they must never credit the wallet.
      return res.status(200).json({
        success: true,
        message: 'No successful payment event to process',
      });
    }

    const orderId =
      payment?.reference ||
      payment?.orderId ||
      payment?.order_id;

    const amount = Number(payment?.amount);

    if (!orderId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid order reference or amount',
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc('complete_recharge', {
      p_order_id: String(orderId),
      p_amount: amount,
    });

    if (error) {
      console.error('Could not complete recharge:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Could not process recharge',
      });
    }

    return res.status(200).json({
      success: true,
      message: data === 'already_processed' ? 'Already processed' : 'Recharge credited',
    });
  } catch (error) {
    console.error(
      'PesaJet callback error:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
}
