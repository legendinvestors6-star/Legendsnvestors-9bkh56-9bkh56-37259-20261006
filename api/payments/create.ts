// api/payments/create.ts - PesaJet Payment Create - Saves to Recharge table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { userId, amount, phone, phoneNumber, method, paymentMethod } = req.body;
    const finalPhone = phone || phoneNumber || '';
    const finalMethod = method || paymentMethod || 'MTN';
    const finalUserId = userId || req.body.user_id || 'unknown';
    const finalAmount = amount || req.body.amount;

    if(!finalAmount) return res.status(400).json({ success: false, error: 'Amount required' });

    const orderId = `pesajet-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

    console.log('Creating payment:', { orderId, finalUserId, finalAmount, finalPhone });

    // SAVE TO SUPABASE - THIS IS WHAT ADMIN PESAJET READS!
    const { data, error } = await supabase.from('investment_packages').insert({
      id: orderId,
      user_id: finalUserId,
      amount: Number(finalAmount),
      product_name: 'RECHARGE',
      status: 'pending',
      payment_method: finalMethod,
      phone_number: finalPhone,
      submitted_at: new Date().toISOString()
    }).select();

    if(error){
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: error.message, hint: 'Run SQL to create investment_packages table' });
    }

    console.log('✅ Saved to investment_packages:', orderId);

    // Return success - Admin will manually confirm after checking MTN 0756406186
    return res.status(200).json({
      success: true,
      orderId,
      id: orderId,
      message: 'Payment pending - Admin will confirm',
      data
    });

  } catch(e:any){
    console.error('create.ts error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
