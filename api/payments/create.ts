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
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const reference = `LGD${Date.now()}${Math.floor(Math.random()*1000)}`

    await supabase.from('recharges').insert([{
      reference, amount: Number(amount), phone: formatted,
      user_id: userId, provider, status: 'pending'
    }])

    const key = process.env.PESAJET_PUBLIC_KEY!
    const base = process.env.PESAJET_BASE_URL || "https://pay.pesajet.com/api/v1"
    
    // This will now be correct once you set PESAJET_BASE_URL
    const url = `${base.replace(/\/$/,'')}/collections`

    console.log("PesaJet FINAL try:", url)

    const pjRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone: formatted,
        reference,
        provider: provider, // airtel or mtn
        currency: "UGX",
        callback_url: "https://legendsnvestors-9bkh56.vercel.app/api/pesajet/webhook"
      })
    })

    const txt = await pjRes.text()
    console.log("PesaJet FINAL response:", txt, "Status:", pjRes.status)

    await supabase.from('recharges').update({ pesajet_response: txt }).eq('reference', reference)

    if (!pjRes.ok) {
      return res.status(200).json({ reference, status: 'failed', pesajet_error: txt, url_tried: url })
    }

    return res.status(200).json({ reference, status: 'pending', message: 'STK sent', pesajet_data: txt })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}