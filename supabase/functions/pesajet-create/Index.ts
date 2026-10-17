import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }})
  }
  try {
    const { amount, phone, provider } = await req.json()
    const secret = Deno.env.get("PESAJET_SECRET_KEY") || Deno.env.get("PESAJET_API_KEY")
    
    const cleanPhone = phone.toString().replace('+256','').replace(/\s/g,'')
    const phone256 = cleanPhone.startsWith('0') ? `256${cleanPhone.slice(1)}` : cleanPhone

    const r = await fetch("https://api.pesajet.com/v1/payments/charge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone: phone256,
        reference: `LEGEND-${Date.now()}`,
        currency: "UGX"
      })
    })
    const data = await r.json()
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    })
  }
})
