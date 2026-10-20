import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { amount, phone, userId, provider } = req.body || {}
    if (!amount || !phone) return res.status(400).json({ error: 'Missing amount/phone' })

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    
    const supabase = createClient(supabaseUrl, serviceKey)
    const reference = `LGD${Date.now()}${Math.floor(Math.random()*1000)}`

    // 1. Save to Supabase recharges table
    const { error: dbError } = await supabase.from('recharges').insert([{
      reference,
      amount,
      phone,
      user_id: userId,
      provider,
      status: 'pending',
      created_at: new Date().toISOString()
    }])
    if (dbError) console.log("DB error", dbError)

    // 2. Call PesaJet (if you have keys, else just return pending)
    const pesajetKey = process.env.PESAJET_PUBLIC_KEY
    let pesajetRes = null
    if (pesajetKey) {
      try {
        const pjRes = await fetch("https://api.pesajet.com/api/v1/payments/request", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${pesajetKey}`
          },
          body: JSON.stringify({
            amount,
            phone: phone.replace(/\s/g,''),
            reference,
            provider
          })
        })
        pesajetRes = await pjRes.text()
      } catch (e) {
        console.log("PesaJet call failed", e.message)
      }
    }

    return res.status(200).json({
      reference,
      status: 'pending',
      message: 'STK push initiated',
      pesajet_data: pesajetRes
    })

  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}