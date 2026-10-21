
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  const { reference } = req.query
  if (!reference) return res.status(400).json({ error: 'Missing reference' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl!, serviceKey!)

  const { data } = await supabase.from('recharges').select('status, amount').eq('reference', reference).single()
  
  return res.status(200).json({ status: data?.status || 'pending', amount: data?.amount })
}