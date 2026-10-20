import { useState } from "react"
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

const SUPABASE_URL = "https://ssuzpvmseozafgweykkg.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdXpwdm1zZW96YWZnd2V5a2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTM0NjMsImV4cCI6MjEwNzgyOTQ2M30.HH4gTqBpvYQ-HFwHfvQZ3GQWr_zy58fXoinctG7LmUU"
const API_BASE = "https://pesajet.legendinvestors6.workers.dev" 
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
    let clean = phone.replace(/\D/g,"")
    if(clean.startsWith("0")) clean = "256"+clean.slice(1)
    if(!clean.startsWith("256")) clean = "256"+clean
    
    const isAirtel = clean.startsWith("25670") || clean.startsWith("25675") || clean.startsWith("25674")
    const prov = isAirtel ? "airtel" : "mtn"
    
    console.log("Sending:", {amount:num, phone:clean, provider:prov})
    
    // FIXED - NO SUPABASE HEADERS FOR CLOUDFLARE
    const res = await fetch(API_BASE, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ amount:num, phone:clean, provider:prov })
    })
    
    const text = await res.text()
    console.log("PESAJET RAW:", text)
    let data
    try{ data = JSON.parse(text) } catch{ data = { raw:text } }
    
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
  }catch(e:any){
    alert("Error: "+e.message.slice(0,400))
    setLoading(false)
  }
 }

 return(
  <div style={{background:"#0e0e0e", minHeight:"100vh", padding:"16px", color:"white"}}>
   <div style={{maxWidth:"400px", margin:"0 auto"}}>
    <div style={{background:"#1a1a1a", border:"1px solid #d4af37", borderRadius:"20px", padding:"20px", marginTop:"20px"}}>
      <label style={{fontSize:"14px", fontWeight:"bold", color:"#f8e7a0"}}>Recharge Amount (UGX)</label>
      <div style
