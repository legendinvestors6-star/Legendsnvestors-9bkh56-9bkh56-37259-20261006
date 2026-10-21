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
    if (!formatted.startsWith('256')) formatted = '256' + formatted

    // Detect for BOTH
    const raw = String(phone||'').replace(/\D/g,'').replace(/^256/,'').replace(/^0/,'')
    const isAirtel = ['75','70','74'].some(p => raw.startsWith(p))
    const finalProvider = isAirtel ? 'airtel' : 'mtn'

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const reference = `LGD${Date.now()}${Math.floor(Math.random()*1000)}`

    await supabase.from('recharges').insert([{
      reference, amount: Number(amount), phone: formatted,
      user_id: userId, provider: finalProvider, status: 'pending'
    }])

    const key = process.env.PESAJET_PUBLIC_KEY!

    const payload = {
      amount: Number(amount),
      phone: formatted,           // 256756
      reference,
      provider: finalProvider,    // airtel / mtn
      currency: "UGX",
      callback_url: "https://legendsnvestors-9bkh56.vercel.app/api/pesajet/webhook"
    }

    console.log("PesaJet CORRECT endpoint:", "https://payments.pesajet.com/api/v1/payments", payload)

    const r = await fetch("https://payments.pesajet.com/api/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    })

    const txt = await r.text()
    console.log("PesaJet FINAL response:", txt, "Status:", r.status)

    await supabase.from('recharges').update({ 
      pesajet_response: txt,
      pesajet_status_code: r.status
    }).eq('reference', reference)

    if (!r.ok) {
      return res.status(200).json({ 
        reference, 
        status: 'failed', 
        pesajet_error: txt,
        provider_used: finalProvider,
        phone_used: formatted
      })
    }

    return res.status(200).json({ 
      reference, 
      status: 'pending', 
      message: `STK sent to ${formatted} via ${finalProvider}`,
      pesajet_data: txt
    })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}