import { useState } from "react"
import { useNavigate } from 'react-router-dom'

const API_BASE = "https://pesajet.legendinvestors6.workers.dev"

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
    if(!clean.startsWith("256")) clean = "256"+clean
    
    const isAirtel = clean.startsWith("25670") || clean.startsWith("25675") || clean.startsWith("25674")
    const prov = isAirtel ? "airtel" : "mtn"
    
    const res = await fetch(API_BASE, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ amount:num, phone:clean, provider:prov })
    })
    
    const text = await res.text()
    let data: any = {}
    try{ data = JSON.parse(text) } catch{ data = { raw:text } }
    
    const txtLower = text.toLowerCase()
    if(txtLower.includes("refused") || txtLower.includes("failed") || txtLower.includes("error") || data.error || data.status==="failed"){
      alert("REFUSED:\n" + text.slice(0,500))
      setLoading(false)
      return
    }
    
    alert("✅ STK sent to "+clean+"! Check phone for PIN")
    navigate("/")
  }catch(err){
    const msg = err instanceof Error ? err.message : String(err)
    alert("Error: "+msg.slice(0,400))
    setLoading(false)
  }
 }

 return(
  <div style={{background:"#0e0e0e", minHeight:"100vh", padding:"16px", color:"white"}}>
   <div style={{maxWidth:"400px", margin:"0 auto"}}>
    <div style={{background:"#1a1a1a", border:"1px solid #d4af37", borderRadius:"20px", padding:"20px", marginTop:"20px"}}>
      <label style={{fontSize:"14px", fontWeight:"bold", color:"#f8e7a0"}}>Amount (UGX)</label>
      <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:"100%", background:"#0e0e0e", border:"1px solid #333", borderRadius:"12px", padding:"14px", color:"white", marginTop:"12px", fontSize:"18px"}} />
    </div>
    <div style={{background:"#1a1a1a", border:"1px solid #d4af37", borderRadius:"20px", padding:"20px", marginTop:"16px"}}>
      <label style={{fontSize:"14px", fontWeight:"bold", color:"#f8e7a0"}}>Phone</label>
      <input value={phone} onChange={e=>setPhone(e.target.value)} style={{width:"100%", background:"#0e0e0e", border:"1px solid #333", borderRadius:"12px", padding:"14px", color:"white", marginTop:"12px"}} />
      <button onClick={handleRecharge} disabled={loading} style={{width:"100%", marginTop:"20px", background:"#d4af37", color:"black", padding:"16px", borderRadius:"12px", fontWeight:"bold", border:"none"}}>{loading ? "Sending..." : "Recharge Now"}</button>
    </div>
   </div>
  </div>
 )
}
