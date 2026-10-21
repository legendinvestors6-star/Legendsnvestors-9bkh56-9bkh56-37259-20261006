import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { amount, phone, userId, provider } = req.body
    let formatted = String(phone||'').replace(/\s/g,'').replace('+','')
    if (formatted.startsWith('0')) formatted = '256' + formatted.slice(1)

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const reference = `LGD${Date.now()}${Math.floor(Math.random()*1000)}`

    await supabase.from('recharges').insert([{
      reference, amount: Number(amount), phone: formatted,
      user_id: userId, provider, status: 'pending'
    }])

    const key = process.env.PESAJET_PUBLIC_KEY!
    const url = "https://payments.pesajet.com/api/v1/payments"

    const payload = {
      amount: Number(amount),
      phone: formatted,
      reference,
      provider: provider, // airtel / mtn
      currency: "UGX",
      callback_url: "https://legendsnvestors-9bkh56.vercel.app/api/pesajet/webhook"
    }

    console.log("Trying auth methods for:", url)

    // Try 3 auth styles that PesaJet Pay uses
    const authTries = [
      { "Content-Type": "application/json", "x-api-key": key, "Accept": "application/json" },
      { "Content-Type": "application/json", "X-API-KEY": key, "Accept": "application/json" },
      { "Content-Type": "application/json", "api-key": key, "Accept": "application/json" },
      { "Content-Type": "application/json", "Authorization": `ApiKey ${key}`, "Accept": "application/json" },
    ]

    for (const headers of authTries) {
      console.log("Trying headers:", JSON.stringify(headers))
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) })
      const txt = await r.text()
      console.log(`Auth ${Object.keys(headers)[1]} => Status ${r.status} => ${txt.substring(0,500)}`)
      
      if (r.status !== 401) {
        // Found correct auth!
        await supabase.from('recharges').update({ pesajet_response: txt }).eq('reference', reference)
        if (r.ok) {
          return res.status(200).json({ reference, status: 'pending', message: `STK sent to ${formatted}`, pesajet_data: txt, auth_used: headers })
        } else {
          return res.status(200).json({ reference, status: 'failed', pesajet_error: txt, auth_used: headers })
        }
      }
    }

    return res.status(200).json({ reference, status: 'failed', error: 'All auth methods 401 - key is wrong or not for payments.pesajet.com' })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}