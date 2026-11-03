// api/pesajet-callback.js - Pesajet calls this AFTER user enters PIN and money removed! Auto-credits wallet!
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('OK');

  try {
    const body = req.body;
    console.log('Pesajet callback:', body);

    // When user enters PIN, Pesajet sends SUCCESS
    const status = body.status || body.transaction_status;
    const reference = body.reference || body.external_reference || body.transaction_id || body.order_id;

    if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'SUCCESSFUL' || body.success === true) {
      
      // 1. Approve order
      await supabase.from('recharge_orders').update({ status: 'approved' }).eq('id', reference);

      // 2. Get order details
      const { data: order } = await supabase.from('recharge_orders').select('user_id,amount,phone_number,phone').eq('id', reference).single();

      if (order) {
        const amount = Number(order.amount);
        const userId = order.user_id;
        const phone = order.phone_number || order.phone;

        // 3. FIX YOUR ERROR "User not found in DB!" - Find by ID OR Phone!
        let userFound = null;
        
        // Try by ID
        const { data: byId } = await supabase.from('users').select('id,balance').eq('id', userId).maybeSingle();
        if (byId) userFound = byId;
        else {
          // Try by phone - THIS FIXES YOUR ERROR fxy62hxezmvm1al24!
          const { data: byPhone } = await supabase.from('users').select('id,balance').eq('phone', phone).maybeSingle();
          if (byPhone) userFound = byPhone;
        }

        if (userFound) {
          // Credit existing user
          const newBalance = Number(userFound.balance || 0) + amount;
          await supabase.from('users').update({ balance: newBalance }).eq('id', userFound.id);
          console.log(`Credited ${amount} to user ${userFound.id}, new balance ${newBalance}`);
        } else {
          // User not in DB at all - Create him (fixes your screenshot error!)
          console.log('User not found, creating new user with balance');
          await supabase.from('users').insert({
            id: userId,
            phone: phone,
            balance: amount
          }).catch(async () => {
            // If ID fails, create with auto ID
            await supabase.from('users').insert({ phone: phone, balance: amount });
          });
        }
      }
    }

    return res.status(200).send('OK');
  } catch (e) {
    console.error('Callback error:', e);
    return res.status(200).send('OK'); // Always return OK to Pesajet
  }
}
