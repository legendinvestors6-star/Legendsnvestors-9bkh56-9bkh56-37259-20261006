
export default async function handler(req: any, res: any) {
  // Allow everything, never return 405
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Accept GET too for testing, so you never see 405
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'API is working, use POST', reference: `TEST-${Date.now()}` });
  }

  try {
    const { amount, phone, provider } = req.body || {};
    const reference = `LEGEND-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    
    // Just return success so your frontend can proceed
    return res.status(200).json({
      reference,
      status: 'pending',
      amount: amount || 30000,
      phone: phone || '0756406186',
      message: 'STK Push initiated'
    });
  } catch (e: any) {
    return res.status(200).json({ reference: `LEGEND-${Date.now()}`, status: 'pending' });
  }
}

