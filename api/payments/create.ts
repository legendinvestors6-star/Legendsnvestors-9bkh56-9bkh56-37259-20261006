import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { amount, phone, userId, provider } = req.body
    const rawPhone = String(phone||'').replace(/\s/g,'')
    let formatted = rawPhone.replace('+','')
    if (formatted.startsWith('0')) formatted = '256' + formatted.slice(1)

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabase = createClient(supabaseUrl!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const reference = `LGD${Date.now()}${Math.floor(Math.random()*1000)}`

    await supabase.from('recharges').insert([{
      reference, amount: Number(amount), phone: formatted,
      user_id: userId, provider, status: 'pending'
    }])

    const key = process.env.PESAJET_PUBLIC_KEY!
    const endpointsToTry = [
      "https://api.pesajet.com/api/v1/collections",
      "https://api.pesajet.com/api/v1/collection",
      "https://pay.pesajet.com/api/v1/collections",
      "https://api.pesajet.com/api/v1/payments",
      "https://api.pesajet.com/api/payments",
    ]

    const payload = {
      amount: Number(amount),
      phone: formatted,
      reference,
      provider: provider || 'mtn',
      currency: 'UGX',
      callback_url: `https://legendsnvestors-9bkh56.vercel.app/api/pesajet/webhook`
    }

    let lastError = ''
    for (const url of endpointsToTry) {
      console.log(`Trying PesaJet endpoint: ${url}`, payload)
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify(payload)
      })
      const txt = await r.text()
      console.log(`Response from ${url}: ${txt} Status ${r.status}`)

      if (r.status !== 404) {
        // Found correct endpoint!
        await supabase.from('recharges').update({ pesajet_response: `${url} => ${txt}` }).eq('reference', reference)
        if (r.ok) {
          return res.status(200).json({ reference, status: 'pending', message: `STK sent via ${url}`, pesajet_data: txt })
        } else {
          return res.status(200).json({ reference, status: 'failed', pesajet_error: txt, tried_url: url })
        }
      }
      lastError = txt
    }

    return res.status(200).json({ 
      reference, 
      status: 'failed', 
      error: 'All PesaJet endpoints returned 404 - check dashboard for correct API docs',
      last_error: lastError
    })

  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}