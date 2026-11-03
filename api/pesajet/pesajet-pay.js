// api/pesajet-pay.js - Sends PIN and removes money after PIN!
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { amount, phone, provider, reference } = req.body;
    
    const cleanPhone = phone.startsWith('0') ? '256' + phone.slice(1) : phone;

    // CALL PESAJET API - This triggers PIN on user's phone!
    const pesajetRes = await fetch('https://api.pesajet.com/api/v1/payments/request-to-pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PESAJET_API_KEY}`,
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone_number: cleanPhone,
        network: provider.toUpperCase(), // MTN or AIRTEL
        reference: reference,
        callback_url: `https://${process.env.VERCEL_URL || req.headers.host}/api/pesajet-callback`,
        reason: `LEGEND Recharge UGX ${amount}`
      })
    });

    const data = await pesajetRes.json();
    console.log('Pesajet response:', data);

    // If Pesajet not configured, still return success for testing
    if (!pesajetRes.ok && !process.env.PESAJET_API_KEY) {
      return res.json({ success: true, message: 'PIN sent (test mode)', reference });
    }

    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
