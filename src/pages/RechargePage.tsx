import { useState } from "react"
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const MIN = 30000

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)

export default function Recharge(){
 const [amount,setAmount]=useState("")
 const [phone,setPhone]=useState("")
 const [loading,setLoading]=useState(false)
 const [polling, setPolling] = useState(false)
 const quick = [30000, 50000, 100000, 200000]

 const startAutoPolling = (reference: string, numAmount: number) => {
   setPolling(true)
   toast.success("Pending... Enter PIN on phone!")
   let attempts = 0
   const interval = setInterval(async () => {
     attempts++
     if(attempts > 60) {
       clearInterval(interval)
       setPolling(false)
       setLoading(false)
       alert("Still pending. If you paid, it will auto-credit shortly. Check Recharge History.")
       window.location.href = "/recharge-history"
       return
     }
     const { data } = await supabase.from('recharges').select('status').eq('reference', reference).single()
     if(data?.status === 'completed') {
       clearInterval(interval)
       try {
         const users = JSON.parse(localStorage.getItem('users') || '[]')
         const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
         const idx = users.findIndex((u:any) => u.id === currentUser.id || u.phone === currentUser.phone)
         if(idx!== -1) {
           users[idx].balance = (users[idx].balance || 0) + numAmount
           localStorage.setItem('users', JSON.stringify(users))
           const updatedCurrent = {...currentUser, balance: users[idx].balance}
           localStorage.setItem('currentUser', JSON.stringify(updatedCurrent))
         } else {
           currentUser.balance = (currentUser.balance || 0) + numAmount
           localStorage.setItem('currentUser', JSON.stringify(currentUser))
         }
         setPolling(false)
         setLoading(false)
         toast.success(`✅ ${numAmount.toLocaleString()} UGX credited!`)
         setTimeout(() => window.location.href = "/", 1500)
       } catch(e) {
         window.location.href = "/"
       }
     }
   }, 3000)
 }

 const handleRecharge = async () => {
  const num = Number(amount);
  if (!num || num < MIN) {
    alert("Minimum is UGX 30,000");
    return;
  }
  if (!phone.trim()) {
    alert("Enter phone number");
    return;
  }
  setLoading(true);
  try {
    const cleanPhone = phone.trim();
    const raw = cleanPhone.replace('+256','').replace(/\s/g,'');
    const withoutZero = raw.startsWith('0')? raw.slice(1) : raw;
    const autoProvider = (withoutZero.startsWith('75') || withoutZero.startsWith('70') || withoutZero.startsWith('74'))? 'airtel' : 'mtn';

    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: num, phone: cleanPhone, userId: cleanPhone, provider: autoProvider })
    });

    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { throw new Error(text.slice(0,300) || "Empty response") }

    if(!res.ok) {
      const realError = data?.pesajet_data?.message || data?.pesajet_data?.error || data?.raw || JSON.stringify(data).slice(0,400)
      throw new Error(realError || "Payment failed")
    }

    const reference = data.reference
    if(reference) {
      startAutoPolling(reference, num)
    } else {
      alert(`STK sent to ${phone}!`)
      window.location.href = "/recharge-history"
    }
  } catch (e: any) {
    alert("Error: " + e.message)
    setLoading(false)
  }
 }

 return(
  <div className="bg-[#0e0e0e] min-h-screen p-4 pb-28 text-white">
   <div className="max-w-md mx-auto">
    <div className="bg-[#1a1a1a] border border-[#d4af37]/50 rounded-[20px] p-5 text-center">
      <h1 className="font-bold text-[18px] text-[#f8e7a0]">Recharge Account</h1>
      <p className="text-[12px] text-gray-400">{polling? "Waiting for PIN..." : "Enter details"}</p>
    </div>
    {polling && (
      <div className="bg-[#f8e7a0]/10 border border-[#f8e7a0] rounded-[20px] p-5 mt-4 text-center animate-pulse">
        <p className="text-[#f8e7a0] font-bold">⏳ Pending - Check phone for PIN</p>
      </div>
    )}
    <div className="bg-[#1a1a1a] border border-[#f8e7a0] rounded-[20px] p-5 mt-4">
      <label className="text-[13px] font-bold text-[#f8e7a0]">Recharge Amount</label>
      <div className="flex mt-2 bg-[#0e0e0e] rounded-xl border border-[#3a3210] px-3 items-center">
        <span className="font-bold text-[#f8e7a0] text-sm">UGX</span>
        <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="Enter amount" className="flex-1 bg-transparent p-3 text-[16px] font-bold text-white outline-none" />
      </div>
      <div className="flex gap-2 mt-3">
        {quick.map(v=>(
          <button key={v} onClick={()=>setAmount(String(v))} className={`text-[12px] px-3 py-1.5 rounded-full border font-semibold ${amount==String(v)? "bg-[#f8e7a0] text-black" : "bg-[#2a2410] text-[#f8e7a0]"}`}>{v/1000}k</button>
        ))}
      </div>
    </div>
    <div className="bg-[#1a1a1a] border border-[#f8e7a0] rounded-[20px] p-5 mt-4">
      <label className="text-[13px] font-bold text-[#f8e7a0]">Phone Number</label>
      <div className="flex mt-2 bg-[#0e0e0e] rounded-xl border border-[#3a3210] px-3 items-center">
        <span className="text-gray-400">📱</span>
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Enter phone number" type="tel" className="flex-1 bg-transparent p-3 text-[15px] text-white outline-none" />
      </div>
      <button onClick={handleRecharge} disabled={loading || polling || Number(amount) < MIN} className="w-full mt-5 bg-gradient-to-b from-[#f8e7a0] to-[#d4af37] disabled:from-gray-600 text-black py-4 rounded-xl font-extrabold text-[16px]">
        {polling? "⏳ Waiting for PIN..." : loading? "Processing..." : "Proceed to Recharge"}
      </button>
    </div>
   </div>
  </div>
 )
          }
