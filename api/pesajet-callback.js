// api/pesajet-callback.js - PesaJet Callback Webhook
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if(req.method === 'OPTIONS') return res.status(200).end();

  try {
    console.log('PesaJet callback:', req.body);
    const { orderId, status, transactionId, amount } = req.body || req.query;

    if(!orderId) return res.status(400).json({ error: 'Missing orderId' });

    // Update investment_packages
    const { error } = await supabase.from('investment_packages')
      .update({ status: status || 'completed' })
      .eq('id', orderId);

    if(error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ success: true, message: 'Callback processed' });
  } catch(e) {
    console.error('callback error:', e);
    return res.status(500).json({ error: e.message });
  }
}
