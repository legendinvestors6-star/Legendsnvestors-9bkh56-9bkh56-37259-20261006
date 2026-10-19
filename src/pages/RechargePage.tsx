 const handleRecharge = async () => {
  const num = Number(amount)
  if(!num || num < 30000){ alert("Minimum UGX 30,000"); return }
  if(!phone){ alert("Enter phone"); return }
  setLoading(true)
  try{
    let clean = phone.replace(/\D/g,"")
    if(clean.startsWith("0")) clean = "256"+clean.slice(1)
    if(!clean.startsWith("256")) clean = "256"+clean
    const prov = clean.startsWith("25675")||clean.startsWith("25670") ? "airtel" : "mtn"
    
    const res = await fetch(API_BASE, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "apikey":SUPABASE_ANON_KEY, "Authorization":`Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ amount:num, phone: clean, provider:prov, phone_raw: phone })
    })
    const data = await res.json()
    console.log("PESAJET RAW RESPONSE:", data) // Check browser console
    
    // THIS IS THE FIX - Check Pesajet status inside data
    if(!res.ok || data.error || data.status === "failed" || data.success === false){
      throw new Error(data.message || data.error || JSON.stringify(data))
    }
    
    // Only if really success
    alert("✅ REAL STK Push sent! Check phone "+phone+" for PIN prompt. Pesajet ID: " + (data.transaction_id || data.reference || "sent"))
    navigate("/")
    
  }catch(e){
    alert("❌ Pesajet Error: "+e.message)
    setLoading(false)
  }
 }
