import { useState } from "react"
import { useNavigate } from 'react-router-dom'

const SUPABASE_URL = "https://ssuzpvmseozafgweykkg.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdXpwdm1zZW96YWZnd2V5a2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTM0NjMsImV4cCI6MjEwNzgyOTQ2M30.HH4gTqBpvYQ-HFwHfvQZ3GQWr_zy58fXoinctG7LmUU"
const API_BASE = SUPABASE_URL + "/functions/v1/hyper-service"

export default function Recharge(){
 const [amount,setAmount]=useState("30000")
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
    const res = await fetch(API_BASE, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "apikey":SUPABASE_ANON_KEY, "Authorization":"Bearer "+SUPABASE_ANON_KEY },
      body: JSON.stringify({ amount:num, phone:clean, provider:"mtn" })
    })
    const data = await res.json()
    console.log(data)
    if(data.error || data.status === "failed"){
      throw new Error(data.message || data.error || JSON.stringify(data))
    }
    alert("RAW PESAJET RESPONSE: " + JSON.stringify(data))
  }catch(e){
    alert("Pesajet Error: "+e.message)
    setLoading(false)
  }
 }

 return(
  <div style={{background:"#0e0e0e", minHeight:"100vh", padding:"16px", color:"white"}}>
   <div style={{maxWidth:"400px", margin:"0 auto"}}>
    <div style={{background:"#1a1a1a", border:"1px solid #d4af37", borderRadius:"20px", padding:"20px", marginTop:"20px"}}>
      <label style={{fontSize:"14px", fontWeight:"bold", color:"#f8e7a0"}}>Recharge Amount (UGX)</label>
      <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:"100%", marginTop:"12px", background:"#0e0e0e", border:"1px solid #333", borderRadius:"12px", padding:"14px", color:"white"}} />
      <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0756406186" style={{width:"100%", marginTop:"12px", background:"#0e0e0e", border:"1px solid #333", borderRadius:"12px", padding:"14px", color:"white"}} />
      <button onClick={handleRecharge} disabled={loading} style={{width:"100%", marginTop:"20px", background:"linear-gradient(#f8e7a0, #d4af37)", color:"black", padding:"16px", borderRadius:"12px", fontWeight:"900"}}>{loading? "Processing..." : "Proceed to Recharge"}</button>
    </div>
   </div>
  </div>
 )
   }
