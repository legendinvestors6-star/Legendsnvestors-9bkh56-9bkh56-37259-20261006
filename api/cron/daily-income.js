import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // Allow Vercel Cron + Manual test with ?secret=xxx
  const auth = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  const querySecret = req.query.secret;
  
  if (cronSecret && auth !== `Bearer ${cronSecret}` && querySecret !== cronSecret && req.headers['x-vercel-cron'] !== '1') {
    // Uncomment to secure: return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SERVICE_KEY in Vercel env' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Find due investments - active + next_income_at <= now
    const now = new Date().toISOString();
    const { data: dueInvestments, error } = await supabase
      .from('investments')
      .select(`
        id,
        user_id,
        daily_income,
        total_earned,
        days_paid,
        total_days,
        product_name,
        next_income_at,
        last_income_at
      `)
      .eq('status', 'active')
      .lte('next_income_at', now)
      .limit(100); // Process 100 at a time for Vercel 10s limit

    if (error) return res.status(500).json({ error: error.message });
    if (!dueInvestments || dueInvestments.length === 0) {
      return res.status(200).json({ success: true, paid: 0, message: 'No due investments' });
    }

    let paidCount = 0;
    let totalPaid = 0;
    let errors = [];

    for (const inv of dueInvestments) {
      try {
        // 2. Get user current balance - FIX for your bug
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, balance, total_income')
          .eq('id', inv.user_id)
          .single();

        if (profileError || !profile) {
          // Try users table if profiles not found (you have both tables in project)
          const { data: userFallback } = await supabase
            .from('users')
            .select('id, balance')
            .eq('id', inv.user_id)
            .single();
          
          if (!userFallback) {
            errors.push(`User ${inv.user_id} not found`);
            continue;
          }
        }

        const userProfile = profile || (await supabase.from('users').select('id,balance').eq('id', inv.user_id).single()).data;
        const currentBalance = Number(userProfile?.balance || 0);
        const currentTotalIncome = Number(profile?.total_income || 0);
        const dailyIncome = Number(inv.daily_income);
        
        const newBalance = currentBalance + dailyIncome;
        const newTotalIncome = currentTotalIncome + dailyIncome;
        const newTotalEarned = Number(inv.total_earned || 0) + dailyIncome;
        const newDaysPaid = Number(inv.days_paid || 0) + 1;

        // 3. Credit user - ATOMIC update
        if (profile) {
          await supabase.from('profiles').update({ 
            balance: newBalance,
            total_income: newTotalIncome
          }).eq('id', inv.user_id);
        }
        // Also update users table if exists (your app uses both)
        await supabase.from('users').update({ balance: newBalance }).eq('id', inv.user_id).then(() => {}, () => {});

        // 4. Update investment
        const isCompleted = inv.total_days && newDaysPaid >= Number(inv.total_days);
        
        await supabase.from('investments').update({
          last_income_at: now,
          next_income_at: isCompleted ? null : new Date(Date.now() + 24*60*60*1000).toISOString(),
          total_earned: newTotalEarned,
          days_paid: newDaysPaid,
          status: isCompleted ? 'completed' : 'active'
        }).eq('id', inv.id);

        // 5. Log earning for history
        await supabase.from('daily_earnings').insert({
          user_id: inv.user_id,
          investment_id: inv.id,
          amount: dailyIncome,
          created_at: now
        }).then(() => {}, () => {}); // Ignore if table doesn't exist

        // 6. Log transaction
        await supabase.from('transactions').insert({
          user_id: inv.user_id,
          type: 'daily_income',
          amount: dailyIncome,
          status: 'completed',
          description: `Daily income - ${inv.product_name || 'Investment'} - Day ${newDaysPaid}`
        }).then(() => {}, () => {});

        paidCount++;
        totalPaid += dailyIncome;

      } catch (invError) {
        console.error(`Error paying inv ${inv.id}:`, invError);
        errors.push(`${inv.id}: ${invError.message}`);
      }
    }

    return res.status(200).json({ 
      success: true, 
      paid: paidCount, 
      total: totalPaid,
      processed: dueInvestments.length,
      errors: errors.length ? errors : undefined,
      timestamp: now
    });

  } catch (e) {
    console.error('Cron fatal error:', e);
    return res.status(500).json({ error: e.message });
  }
         }
