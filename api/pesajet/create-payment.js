import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, phone, network, userId, orderId } = req.body; // network: MTN or AIRTEL

  const PESAJET_API_KEY = process.env.PESAJET_API_KEY; // Get from pesajet.com dashboard
  const PESAJET_MERCHANT_ID = process.env.PESAJET_MERCHANT_ID;

  if (!PESAJET_API_KEY) {
    return res.status(500).json({ error: 'PesaJet API key not configured' });
  }

  try {
    // Call PesaJet Pay API - Create payment
    const pesajetRes = await fetch('https://api.pesajet.com/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PESAJET_API_KEY}`,
        'X-Merchant-ID': PESAJET_MERCHANT_ID
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone: phone.replace('+', '').replace(' ', ''), // 2567XXXXXXXX
        network: network, // MTN or AIRTEL
        reference: orderId || `LEGEND-${Date.now()}`,
        callback_url: `${process.env.VITE_APP_URL || 'https://your-app.vercel.app'}/api/pesajet/webhook`,
        description: `Legend Recharge UGX ${amount}`
      })
    });

    const data = await pesajetRes.json();

    if (!pesajetRes.ok) {
      return res.status(400).json({ error: data.message || 'PesaJet failed', details: data });
    }

    // Save pending transaction
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    await supabase.from('pesajet_transactions').insert({
      order_id: orderId,
      user_id: userId,
      amount,
      phone,
      network,
      pesajet_id: data.id || data.transaction_id,
      status: 'pending',
      created_at: new Date().toISOString()
    }).catch(()=>{});

    return res.status(200).json({ 
      success: true, 
      transaction_id: data.id || data.transaction_id,
      message: 'Payment request sent to phone - Enter PIN to confirm'
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
