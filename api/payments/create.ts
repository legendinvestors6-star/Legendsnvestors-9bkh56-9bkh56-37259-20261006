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

    // FINAL minimal payload - no callbackUrl at all
    const payload = {
      amount: Number(amount),
      phoneNumber: formatted,
      reference,
      provider: provider, // 'airtel' or 'mtn'
      currency: "UGX"
    }

    console.log("Minimal payload:", payload)

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
      // If provider name wrong, try the other format automatically
      if (txt.includes('provider') || r.status === 400) {
        const altProvider = provider === 'airtel' ? 'AIRTEL_UG' : provider === 'mtn' ? 'MTN_UG' : provider
        const altPayload = { ...payload, provider: altProvider }
        console.log("Retrying with:", altPayload)
        const r2 = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key, "Accept": "application/json" },
          body: JSON.stringify(altPayload)
        })
        const txt2 = await r2.text()
        console.log(`Retry Status ${r2.status} => ${txt2}`)
        await supabase.from('recharges').update({ pesajet_response: txt2 }).eq('reference', reference)
        return res.status(200).json({ 
          reference, 
          status: r2.ok ? 'pending' : 'failed', 
          provider_tried: altProvider,
          pesajet_response: txt2,
          status_code: r2.status
        })
      }
      return res.status(200).json({ reference, status: 'failed', pesajet_error: txt, status_code: r.status })
    }

    return res.status(200).json({ reference, status: 'pending', message: `STK sent to ${formatted}`, pesajet_data: txt })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}