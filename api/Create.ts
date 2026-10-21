// file: api/payments/create.ts  (must be at ROOT, not inside src)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed, use POST' });

  try {
    const { amount, phone, userId, provider } = req.body || {};
    
    if (!amount || !phone) {
      return res.status(400).json({ error: 'Missing amount or phone', received: req.body });
    }

    // --- Supabase (optional, won't crash if keys missing) ---
    let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const reference = `LEGEND-${Date.now()}-${Math.random().toString(36).slice(2,4)}`;
        
        // Make sure table 'recharges' exists in Supabase
        const { error } = await supabase.from('recharges').insert([{
          reference,
          user_id: userId || phone,
          phone,
          amount: Number(amount),
          provider: provider || 'mtn',
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
        
        if (error) console.log('Supabase insert error (non-fatal):', error.message);

        // Try PesaJet if you have key
        const pesaKey = process.env.PESAJET_API_KEY;
        if (pesaKey) {
          try {
            // REPLACE THIS URL with your real PesaJet endpoint if different
            const pjRes = await fetch('https://api.pesajet.com/api/v1/payment/initiate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pesaKey}`
              },
              body: JSON.stringify({
                amount: Number(amount),
                phone: phone.startsWith('0') ? `256${phone.slice(1)}` : phone,
                reference,
                provider
              })
            });
            const pjData = await pjRes.json().catch(()=> ({}));
            return res.status(200).json({ reference, status: 'pending', pesajet_data: pjData });
          } catch (pjErr: any) {
            console.log('PesaJet call failed, returning pending anyway:', pjErr.message);
            return res.status(200).json({ reference, status: 'pending', warning: 'PesaJet call failed' });
          }
        }

        // No PesaJet key = return reference anyway so frontend doesn't get empty
        return res.status(200).json({ reference, status: 'pending', mock: true, message: 'Add PESAJET_API_KEY to enable real STK' });

      } catch (innerErr: any) {
        console.log('Inner error:', innerErr.message);
        const reference = `LEGEND-${Date.now()}`;
        return res.status(200).json({ reference, status: 'pending', warning: innerErr.message });
      }
    } else {
      // No Supabase env = still return reference so frontend never gets empty
      const reference = `LEGEND-${Date.now()}`;
      console.log('No Supabase env vars found');
      return res.status(200).json({ reference, status: 'pending', mock: true });
    }

  } catch (e: any) {
    console.error('FATAL API ERROR:', e);
    // ALWAYS return JSON, never empty
    return res.status(500).json({ error: e.message || 'Server error', stack: e.stack?.slice(0,500) });
  }
}