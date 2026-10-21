import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { amount, phone, provider } = req.body
    let formatted = String(phone||'').replace(/\s/g,'').replace('+','')
    if (formatted.startsWith('0')) formatted = '256' + formatted.slice(1)

    const key = process.env.PESAJET_PUBLIC_KEY!
    const reference = `LGD${Date.now()}`

    const urls = [
      "https://pay.pesajet.com/api/v1/collections",
      "https://pay.pesajet.com/api/collections",
      "https://pay.pesajet.com/api/v1/collection",
      "https://api.pay.pesajet.com/api/v1/collections",
      "https://merchant.pesajet.com/api/v1/collections",
      "https://api.pesajet.com/api/collections",
      "https://pesajet.com/api/v1/collections",
      "https://api.pesajet.com/api/v2/collections",
      "https://api.pesajet.com/api/v1/payments",
      "https://pay.pesajet.com/api/v1/payments",
      "https://api.pesajet.com/api/v1/payment/request",
      "https://pesajet.com/api/collections/request",
    ]

    for (const url of urls) {
      console.log(`Trying: ${url}`)
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "Accept": "application/json" },
          body: JSON.stringify({ amount: Number(amount), phone: formatted, reference, provider, currency: "UGX" })
        })
        const txt = await r.text()
        console.log(`Result ${url} => Status ${r.status} => ${txt.substring(0, 300)}`)
        if (r.status !== 404) {
          // Found something that is NOT 404 - this is the real endpoint!
          return res.status(200).json({ found_url: url, status: r.status, response: txt })
        }
      } catch (e: any) {
        console.log(`Error ${url}: ${e.message}`)
      }
    }

    return res.status(200).json({ error: "All URLs 404 - your PesaJet account is NOT on pay.pesajet.com or api.pesajet.com - you need API docs from dashboard" })

  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}