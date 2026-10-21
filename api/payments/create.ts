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

    // FIXED payload per error message
    const payload = {
      amount: Number(amount),
      phoneNumber: formatted,        // was 'phone' -> now 'phoneNumber'
      reference,
      provider: provider,           // try 'airtel' / 'mtn' - if fails, try 'AIRTEL_UG' / 'MTN_UG'
      currency: "UGX",
      // callback_url removed - it said should not exist
      // If webhook needed, try callbackUrl or webhook
      callbackUrl: "https://legendsnvestors-9bkh56.vercel.app/api/pesajet/webhook"
    }

    console.log("Fixed payload:", payload)

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    })

    const txt = await r.text()
    console.log(`Status ${r.status} => ${txt}`)

    await supabase.from('recharges').update({ pesajet_response: txt }).eq('reference', reference)

    if (!r.ok) {
      // Try alternative provider format if still 400
      if (txt.includes('provider')) {
        console.log("Trying AIRTEL_UG format...")
        const altPayload = { ...payload, provider: provider === 'airtel' ? 'AIRTEL_UG' : 'MTN_UG' }
        const r2 = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key, "Accept": "application/json" },
          body: JSON.stringify(altPayload)
        })
        const txt2 = await r2.text()
        console.log(`Alt provider Status ${r2.status} => ${txt2}`)
        await supabase.from('recharges').update({ pesajet_response: txt2 }).eq('reference', reference)
        if (r2.ok) {
          return res.status(200).json({ reference, status: 'pending', message: `STK sent to ${formatted}`, pesajet_data: txt2 })
        }
        return res.status(200).json({ reference, status: 'failed', pesajet_error: txt2 })
      }
      return res.status(200).json({ reference, status: 'failed', pesajet_error: txt })
    }

    return res.status(200).json({ reference, status: 'pending', message: `STK sent to ${formatted}`, pesajet_data: txt })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}