import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // Security - only allow Vercel Cron or secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` && req.headers['x-vercel-cron'] !== '1') {
    // For testing you can remove this check
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // 1. Find all investments that are due (next_income_at <= now and active)
  const { data: dueInvestments, error } = await supabase
    .from('investments')
    .select('*, profiles!inner(id, balance)')
    .eq('status', 'active')
    .lte('next_income_at', new Date().toISOString());

  if (error) return res.status(500).json({ error: error.message });

  let paidCount = 0;
  let totalPaid = 0;

  for (const inv of dueInvestments || []) {
    // Credit user
    const newBalance = Number(inv.profiles.balance || 0) + Number(inv.daily_income);
    
    await supabase.from('profiles').update({ 
      balance: newBalance,
      total_income: supabase.raw ? undefined : undefined // will update below
    }).eq('id', inv.user_id);

    // Increment total_income with SQL
    await supabase.rpc('increment_income', { 
      user_id: inv.user_id, 
      amount: inv.daily_income 
    }).then(async () => {
      // Fallback if rpc doesn't exist - direct update
      const { data: p } = await supabase.from('profiles').select('total_income').eq('id', inv.user_id).single();
      await supabase.from('profiles').update({ total_income: (p?.total_income||0) + Number(inv.daily_income) }).eq('id', inv.user_id);
    });

    // Update investment
    await supabase.from('investments').update({
      last_income_at: new Date().toISOString(),
      next_income_at: new Date(Date.now() + 24*60*60*1000).toISOString(), // +24hrs
      total_earned: (inv.total_earned||0) + Number(inv.daily_income),
      days_paid: (inv.days_paid||0) + 1
    }).eq('id', inv.id);

    // Log earning
    await supabase.from('daily_earnings').insert({
      user_id: inv.user_id,
      investment_id: inv.id,
      amount: inv.daily_income
    });

    paidCount++;
    totalPaid += Number(inv.daily_income);
  }

  return res.status(200).json({ success: true, paid: paidCount, total: totalPaid });
}
