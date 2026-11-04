// api/payments/status.ts - Check payment status
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { orderId, id } = req.query || req.body;
    const finalId = orderId || id;

    if(!finalId) return res.status(400).json({ error: 'Missing orderId' });

    const { data, error } = await supabase.from('investment_packages').select('*').eq('id', finalId).single();

    if(error) return res.status(404).json({ error: 'Order not found' });

    return res.status(200).json({ success: true, status: data.status, data });
  } catch(e:any){
    return res.status(500).json({ error: e.message });
  }
}
