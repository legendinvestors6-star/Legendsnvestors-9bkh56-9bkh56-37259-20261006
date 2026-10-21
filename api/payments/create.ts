import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { amount, phone, userId, provider } = req.body
    const rawPhone = String(phone || '').replace(/\s/g,'')
    
    // 0756406186 -> 256756406186 (works for BOTH MTN and Airtel)
    let formatted = rawPhone.replace('+','')
    if (formatted.startsWith('0')) formatted = '256' + formatted.slice(1)
    if (!formatted.startsWith('256')) formatted = '256' + formatted

    // Detect provider BOTH
    const withoutZero = rawPhone.replace('+256','').replace(/^0/,'')
    const isAirtel = ['75','70','74'].some(p => withoutZero.startsWith(p))
    const finalProvider = isAirtel ? 'airtel' : 'mtn'
    // PesaJet sometimes wants uppercase
    const pesajetProvider = isAirtel ? 'AIRTEL_UG' : 'MTN_UG'

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabase = createClient(supabaseUrl!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const reference = `LGD${Date.now()}${Math.floor(Math.random()*1000)}`

    await supabase.from('recharges').insert([{
      reference, amount: Number(amount), phone: formatted,
      user_id: userId, provider: finalProvider, status: 'pending'
    }])

    const key = process.env.PESAJET_PUBLIC_KEY
    if (!key) {
      return res.status(200).json({ reference, status: 'pending', mock: true, message: 'No PESAJET key - mock' })
    }

    // Try BOTH PesaJet endpoints - v1/request and v1/collections
    const payload = {
      amount: Number(amount),
      phone: formatted,
      reference,
      provider: finalProvider, // try lower
      network: pesajetProvider, // try upper
      callback_url: `https://legendsnvestors-9bkh56.vercel.app/api/pesajet/webhook`,
      currency: 'UGX'
    }

    console.log("Sending to PesaJet:", payload)

    const pjRes = await fetch("https://api.pesajet.com/api/v1/payments/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify(payload)
    })

    const pjText = await pjRes.text()
    console.log("PesaJet RAW response:", pjText, "Status:", pjRes.status)

    // Save response to DB so you can see it in Supabase without Logs tab
    await supabase.from('recharges').update({ 
      pesajet_response: pjText 
    }).eq('reference', reference)

    if (!pjRes.ok) {
      return res.status(200).json({ 
        reference, 
        status: 'failed',
        pesajet_error: pjText,
        debug_phone: formatted,
        debug_provider: finalProvider
      })
    }

    return res.status(200).json({ reference, status: 'pending', message: `STK sent to ${formatted} via ${finalProvider}`, pesajet_data: pjText })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}