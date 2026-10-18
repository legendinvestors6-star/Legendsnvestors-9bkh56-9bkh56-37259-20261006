import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, phone, provider } = await req.json()
    
    if (!amount || !phone) {
      throw new Error("amount and phone required")
    }

    const secret = Deno.env.get("PESAJET_SECRET_KEY") || Deno.env.get("PESAJET_API_KEY")
    
    if (!secret) {
      throw new Error("PESAJET_SECRET_KEY not set in Supabase secrets")
    }
    
    const cleanPhone = phone.toString().replace('+256','').replace(/\s/g,'')
    const phone256 = cleanPhone.startsWith('0') ? `256${cleanPhone.slice(1)}` : cleanPhone

    console.log("Charging:", phone256, amount)

    const r = await fetch("https://api.pesajet.com/v1/payments/charge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone: phone256,
        provider: provider || "mtn",
        reference: `LEGEND-${Date.now()}`,
        callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/pesajet-callback`
      })
    })

    const data = await r.json()
    console.log("PesaJet response:", data)

    if (!r.ok) {
      throw new Error(data.message || JSON.stringify(data))
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
