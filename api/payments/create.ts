import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { amount, phone, userId, provider } = req.body
    console.log("Incoming:", { amount, phone, provider })

    if (!amount || !phone) return res.status(400).json({ error: 'Missing amount/phone' })

    // FIX PHONE: 0756406186 -> 256756406186
    const formattedPhone = phone.replace(/\s/g,'').replace('+','')
      .replace(/^0/, '256')

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(supabaseUrl!, serviceKey!)

    const reference = `LGD${Date.now()}${Math.floor(Math.random()*1000)}`

    await supabase.from('recharges').insert([{
      reference, amount, phone: formattedPhone, user_id: userId, provider, status: 'pending'
    }])

    const pesajetKey = process.env.PESAJET_PUBLIC_KEY
    console.log("PesaJet key exists?", !!pesajetKey, "Phone formatted:", formattedPhone)

    if (!pesajetKey) {
      return res.status(200).json({
        reference, status: 'pending', 
        error: 'PESAJET_PUBLIC_KEY missing in Vercel env - running in mock mode, no real STK sent!'
      })
    }

    // Real PesaJet call
    const pjRes = await fetch("https://api.pesajet.com/api/v1/payments/request", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pesajetKey}`
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone: formattedPhone,
        reference,
        provider: provider || 'mtn',
        callback_url: `https://${req.headers.host}/api/pesajet/webhook`
      })
    })

    const pjText = await pjRes.text()
    console.log("PesaJet response:", pjText, "Status:", pjRes.status)

    if (!pjRes.ok) {
      return res.status(200).json({
        reference, status: 'failed',
        pesajet_error: pjText,
        message: 'PesaJet rejected request - check logs'
      })
    }

    return res.status(200).json({ reference, status: 'pending', message: 'STK actually sent', pesajet_data: pjText })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}