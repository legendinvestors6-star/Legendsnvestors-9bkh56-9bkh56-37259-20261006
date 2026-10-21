import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { amount, phone, userId, provider } = req.body
    let formatted = String(phone).replace(/\s/g,'').replace('+','')
    if (formatted.startsWith('0')) formatted = '256' + formatted.slice(1)

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const reference = `LGD${Date.now()}`

    await supabase.from('recharges').insert([{
      reference, amount: Number(amount), phone: formatted,
      user_id: userId, provider, status: 'pending'
    }])

    const r = await fetch("https://payments.pesajet.com/api/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.PESAJET_PUBLIC_KEY!,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        amount: Number(amount),
        phoneNumber: formatted,
        reference,
        provider, // airtel or mtn - both work now
        currency: "UGX"
      })
    })

    const data = await r.json()
    
    if (!r.ok) {
      await supabase.from('recharges').update({ status: 'failed', pesajet_response: JSON.stringify(data) }).eq('reference', reference)
      return res.status(200).json({ reference, status: 'failed', error: data })
    }

    await supabase.from('recharges').update({ pesajet_id: data.id || data.transactionId, pesajet_response: JSON.stringify(data) }).eq('reference', reference)

    return res.status(200).json({ 
      reference, 
      status: 'pending', 
      message: 'STK sent! Enter PIN on phone',
      pesajet: data
    })

  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}