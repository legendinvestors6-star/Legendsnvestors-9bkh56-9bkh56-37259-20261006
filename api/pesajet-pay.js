// api/pesajet-pay.js - PesaJet Pay - Uses Recharge Table + Webhook
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { userId, amount, phoneNumber, paymentMethod } = req.body;
    
    if(!userId || !amount) return res.status(400).json({ error: 'Missing userId or amount' });

    const orderId = 'pesajet-' + Date.now() + '-' + Math.random().toString(36).slice(2,7);
    
    // SAVE TO SUPABASE - This is what Admin PesaJet reads!
    const { data, error } = await supabase.from('investment_packages').insert({
      id: orderId,
      user_id: userId,
      amount: Number(amount),
      product_name: 'RECHARGE',
      status: 'pending',
      payment_method: paymentMethod || 'MTN',
      phone_number: phoneNumber || '',
      submitted_at: new Date().toISOString()
    }).select();

    if(error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message, hint: 'Run SQL to create table + RLS policy' });
    }

    console.log('✅ PesaJet RECHARGE saved:', orderId);

    // Here you can call real PesaJet API if you have keys
    // For now, we return success - Admin will manually confirm after verifying MTN 0756406186

    return res.status(200).json({ 
      success: true, 
      orderId, 
      message: 'PesaJet payment pending - Admin will confirm after verifying MTN 0756406186',
      data 
    });

  } catch(e) {
    console.error('pesajet-pay error:', e);
    return res.status(500).json({ error: e.message });
  }
                    }
