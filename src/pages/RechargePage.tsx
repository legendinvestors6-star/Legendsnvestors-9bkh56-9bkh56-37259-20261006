import { useState } from "react"
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

const SUPABASE_URL = "https://ssuzpvmseozafgweykkg.supabase.co"
const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_KEY_HERE" // <-- Go to Supabase -> Project Settings -> API -> anon public -> copy eyJ...
const API_BASE = `${SUPABASE_URL}/functions/v1/hyper-service`

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default function Recharge(){
 const [amount,setAmount]=useState("")
 const [phone,setPhone]=useState("0756406186")
 const [loading,setLoading]=useState(false)
 const navigate = useNavigate()

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
      body: JSON.stringify({ amount:num, phone, provider:prov })
    })
    const data = await res.json()
    if(!res.ok) throw new Error(data.error||JSON.stringify(data))
    alert("✅ STK Push sent to "+phone+"! Enter PIN.")
    navigate("/")
  }catch(e){
    if(e.message.includes("Name or service")||e.message.includes("503")){
      alert("Network busy - wait 30 sec and retry")
    } else {
      alert("Error: "+e.message)
    }
    setLoading(false)
  }
 }

 return(
  <div style={{background:"#0e0e0e", minHeight:"100vh", padding:"16px", color:"white"}}>
   <div style={{maxWidth:"400px", margin:"0 auto"}}>
    
    {/* AMOUNT SECTION - BIG AND CLEAR */}
    <div style={{background:"#1a1a1a", border:"1px solid #d4af37", borderRadius:"20px", padding:"20px", marginTop:"20px"}}>
      <label style={{fontSize:"14px", fontWeight:"bold", color:"#f8e7a0"}}>Recharge Amount (UGX)</label>
      <div style={{display:"flex", gap:"8px", marginTop:"12px", background:"#0e0e0e", borderRadius:"12px", padding:"4px 12px", border:"1px solid #333", alignItems:"center"}}>
        <span style={{color:"#f8e7a0", fontWeight:"bold"}}>UGX</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="30000"
          value={amount}
          onChange={e=>setAmount(e.target.value)}
          style={{flex:1, background:"transparent", border:"none", outline:"none", color:"white", padding:"14px 8px", fontSize:"18px", fontWeight:"bold"}}
        />
      </div>
      <div style={{display:"flex", gap:"8px", marginTop:"12px"}}>
        {[30000,50000,100000,200000].map(v=>(
          <button key={v} onClick={()=>setAmount(String(v))} style={{flex:1, padding:"8px", borderRadius:"20px", border:"1px solid #d4af37", background: amount==String(v)? "#f8e7a0" : "#2a2410", color: amount==String(v)? "black":"#f8e7a0", fontWeight:"bold", fontSize:"12px"}}>{v/1000}k</button>
        ))}
      </div>
    </div>

    {/* PHONE SECTION */}
    <div style={{background:"#1a1a1a", border:"1px solid #d4af37", borderRadius:"20px", padding:"20px", marginTop:"16px"}}>
      <label style={{fontSize:"14px", fontWeight:"bold", color:"#f8e7a0"}}>Phone Number</label>
      <input
        type="tel"
        value={phone}
        onChange={e=>setPhone(e.target.value)}
        placeholder="0756406186"
        style={{width:"100%", marginTop:"12px", background:"#0e0e0e", border:"1px solid #333", borderRadius:"12px", padding:"14px", color:"white", fontSize:"16px", outline:"none", boxSizing:"border-box"}}
      />
      <button onClick={handleRecharge} disabled={loading} style={{width:"100%", marginTop:"20px", background: loading? "#555" : "linear-gradient(#f8e7a0, #d4af37)", color:"black", padding:"16px", borderRadius:"12px", fontWeight:"900", fontSize:"16px", border:"none"}}>
        {loading? "Processing..." : "Proceed to Recharge"}
      </button>
    </div>

   </div>
  </div>
 )
}
