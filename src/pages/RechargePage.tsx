import { useState } from "react"
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

const SUPABASE_URL = "https://ssuzpvmseozafgweykkg.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdXpwdm1zZW96YWZnd2V5a2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTM0NjMsImV4cCI6MjEwNzgyOTQ2M30.HH4gTqBpvYQ-HFwHfvQZ3GQWr_zy58fXoinctG7LmUU"
const API_BASE = `${SUPABASE_URL}/functions/v1/hyper-service`
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
    // 1. CLEAN PHONE CORRECTLY
    let clean = phone.replace(/\D/g,"")
    if(clean.startsWith("0")) clean = "256"+clean.slice(1)
    if(!clean.startsWith("256")) clean = "256"+clean
    
    // 2. DETECT PROVIDER
    const isAirtel = clean.startsWith("25670") || clean.startsWith("25675") || clean.startsWith("25674")
    const prov = isAirtel ? "airtel" : "mtn"
    
    console.log("Sending:", {amount:num, phone:clean, provider:prov})
    
    const res = await fetch(API_BASE, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "apikey":SUPABASE_ANON_KEY, "Authorization":`Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ amount:num, phone:clean, provider:prov }) // FIXED: send clean not phone
    })
    
    const text = await res.text()
    console.log("PESAJET RAW:", text)
    let data
    try{ data = JSON.parse(text) } catch{ data = { raw:text } }
    
    // 3. SHOW REAL RESULT, NOT FAKE
    const txtLower = text.toLowerCase()
    if(txtLower.includes("refused") || txtLower.includes("failed") || txtLower.includes("error") || data.error || data.status==="failed"){
      alert("❌ REFUSED by PesaJet:\n" + text.slice(0,400))
      setLoading(false)
      return
    }
    
    if(res.ok){
      alert("✅ REAL STK Push sent to "+clean+"!\nCheck phone NOW for PIN prompt.\nProvider: "+prov.toUpperCase())
      navigate("/")
    } else {
      throw new Error(text)
    }
  }catch(e){
    alert("Error: "+e.message.slice(0,400))
    setLoading(false)
  }
 }

 return(
  <div style={{background:"#0e0e0e", minHeight:"100vh", padding:"16px", color:"white"}}>
   <div style={{maxWidth:"400px", margin:"0 auto"}}>
    <div style={{background:"#1a1a1a", border:"1px solid #d4af37", borderRadius:"20px", padding:"20px", marginTop:"20px"}}>
      <label style={{fontSize:"14px", fontWeight:"bold", color:"#f8e7a0"}}>Recharge Amount (UGX)</label>
      <div style={{display:"flex", gap:"8px", marginTop:"12px", background:"#0e0e0e", borderRadius:"12px", padding:"4px 12px", border:"1px solid #333", alignItems:"center"}}>
        <span style={{color:"#f8e7a0", fontWeight:"bold"}}>UGX</span>
        <input type="number" inputMode="numeric" placeholder="30000" value={amount} onChange={e=>setAmount(e.target.value)} style={{flex:1, background:"transparent", border:"none", outline:"none", color:"white", padding:"14px 8px", fontSize:"18px", fontWeight:"bold"}} />
      </div>
      <div style={{display:"flex", gap:"8px", marginTop:"12px"}}>
        {[30000,50000,100000,200000].map(v=>(
          <button key={v} onClick={()=>setAmount(String(v))} style={{flex:1, padding:"8px", borderRadius:"20px", border:"1px solid #d4af37", background: amount==String(v)? "#f8e7a0" : "#2a2410", color: amount==String(v)? "black":"#f8e7a0", fontWeight:"bold", fontSize:"12px"}}>{v/1000}k</button>
        ))}
      </div>
    </div>
    <div style={{background:"#1a1a1a", border:"1px solid #d4af37", borderRadius:"20px", padding:"20px", marginTop:"16px"}}>
      <label style={{fontSize:"14px", fontWeight:"bold", color:"#f8e7a0"}}>Phone Number</label>
