import { useState } from "react"
import { useNavigate } from "react-router-dom"

const MIN = 30000
const BACKEND_URL = "https://YOUR-VERCEL-APP.vercel.app" // <-- PUT YOUR BACKEND HERE

export default function Recharge(){
 const [amount,setAmount]=useState("")
 const [phone,setPhone]=useState("")
 const [loading,setLoading]=useState(false)
 const navigate = useNavigate()
 const quick = [30000,50000,100000,200000]

 const handleRecharge = async () => {
  const num = Number(amount)
  if(num < MIN) return alert("Min 30,000 UGX")
  if(!phone) return alert("Enter phone")
  setLoading(true)
  try{
    const clean = phone.replace('+256','').replace(/\s/g,'')
    const withoutZero = clean.startsWith('0')? clean.slice(1):clean
    const provider = (withoutZero.startsWith('75')||withoutZero.startsWith('70'))?'airtel':'mtn'
    
    const res = await fetch(`${BACKEND_URL}/api/payments/create`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({amount:num, phone:clean, provider})
    })
    const data = await res.json()
    if(!res.ok) throw new Error(data.message||"Failed")
    
    alert(`STK Push sent to ${phone}! Enter PIN.`)
    navigate("/recharge-status")
  }catch(e:any){
    alert("Error: "+e.message)
  }finally{setLoading(false)}
 }

 return(
  <div className="bg-[#0e0e0e] min-h-screen p-4 text-white">
   <h1 className="text-[#f8e7a0] font-bold text-center">Recharge via PesaJet</h1>
   <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount (min 30000)" className="w-full bg-[#1a1a1a] p-3 mt-4 rounded-xl border border-[#d4af37]" />
   <div className="flex gap-2 mt-2">{quick.map(v=><button key={v} onClick={()=>setAmount(String(v))} className="bg-[#2a2410] text-[#f8e7a0] px-3 py-1 rounded-full text-xs">{v/1000}k</button>)}</div>
   <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XXXXXXXX" className="w-full bg-[#1a1a1a] p-3 mt-4 rounded-xl border border-[#d4af37]" />
   <button onClick={handleRecharge} disabled={loading} className="w-full mt-5 bg-gradient-to-b from-[#f8e7a0] to-[#d4af37] text-black py-4 rounded-xl font-bold">
     {loading?"Processing...":"Pay with PesaJet"}
   </button>
  </div>
 )
}
