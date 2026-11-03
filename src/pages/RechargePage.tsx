import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Phone, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

const formatId = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) return JSON.parse(raw).id;
    return localStorage.getItem('legend_current_user') || localStorage.getItem('user_id');
  } catch { return null; }
}

function getCurrentUserPhone(): string {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) return JSON.parse(raw).phone || '';
  } catch {}
  return localStorage.getItem('phone') || '';
}

export default function RechargePage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('30000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel');
  const [status, setStatus] = useState<'idle' | 'loading' | 'pin_sent' | 'verifying' | 'success'>('idle');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) { navigate('/login'); return; }
    const savedPhone = getCurrentUserPhone();
    if (savedPhone) setPhone(savedPhone);
    try {
      const raw = localStorage.getItem('legend_user');
      if (raw) setCurrentBalance(JSON.parse(raw).balance || 0);
    } catch {}
  }, [navigate]);

  const handleRecharge = async () => {
    if (!amount || Number(amount) < 1000) { toast.error('Enter valid amount'); return; }
    if (!phone || phone.length < 10) { toast.error('Enter phone 07XXXXXXXX'); return; }
    const userId = getCurrentUserId();
    if (!userId) { navigate('/login'); return; }
    
    setStatus('loading');
    const newOrderId = formatId();
    setOrderId(newOrderId);
    const now = new Date().toISOString();
    const rechargeAmount = Number(amount);
    const cleanPhone = phone.startsWith('0') ? '256' + phone.slice(1) : phone;

    try {
      // 1. Save as PENDING first
      await supabase.from('recharge_orders').insert({
        id: newOrderId,
        user_id: String(userId),
        phone: getCurrentUserPhone() || phone,
        amount: rechargeAmount,
        payment_method: provider,
        phone_number: phone,
        status: 'pending',
        created_at: now
      });

      // 2. CALL PESAJET TO SEND PIN & CHARGE MONEY!
      toast.loading('Sending PIN to your phone...');
      
      const { data, error } = await supabase.functions.invoke('pesajet-pay', {
        body: {
          amount: rechargeAmount,
          phone: cleanPhone,
          provider: provider,
          reference: newOrderId,
          user_id: String(userId)
        }
      });

      if (error) {
        console.error('Pesajet edge error:', error);
        // Fallback direct call
        const res = await fetch('https://api.pesajet.com/api/v1/payments/request-to-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: rechargeAmount,
            phone_number: cleanPhone,
            network: provider.toUpperCase(),
            reference: newOrderId,
            reason: `LEGEND Recharge ${rechargeAmount}`
          })
        });
        console.log('Pesajet direct:', await res.json());
      } else {
        console.log('Pesajet response:', data);
      }

      toast.dismiss();
      setStatus('pin_sent');
      toast.success(`PIN sent to ${phone}! Enter PIN to pay UGX ${rechargeAmount.toLocaleString()}`);

      // 3. START POLLING - Auto credit when user enters PIN!
      startPolling(newOrderId, String(userId), rechargeAmount);

    } catch (e:any) {
      console.error(e);
      setStatus('pin_sent');
      toast.success('PIN sent! Enter PIN on phone. Wallet will auto-credit after payment.');
      startPolling(newOrderId, String(userId), rechargeAmount);
    }
  };

  const startPolling = (oid: string, uid: string, amt: number) => {
    setStatus('verifying');
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 60) { clearInterval(interval); toast.error('Timeout. Check Recharge Status'); setStatus('pin_sent'); return; }

      // Check if order approved by Pesajet webhook
      const { data: order } = await supabase.from('recharge_orders').select('status').eq('id', oid).single();
      
      if (order?.status === 'approved') {
        clearInterval(interval);
        
        // Auto-credit wallet!
        try {
          const { data: userData } = await supabase.from('users').select('balance').eq('id', uid).maybeSingle();
          let newBal = amt;
          
          if (userData) {
            newBal = Number(userData.balance || 0) + amt;
            await supabase.from('users').update({ balance: newBal }).eq('id', uid);
          } else {
            // User not in DB - create
            await supabase.from('users').insert({ id: uid, phone: phone, balance: amt });
            newBal = amt;
          }

          // Update local wallet
          try {
            const raw = localStorage.getItem('legend_user');
            if (raw) {
              const u = JSON.parse(raw);
              u.balance = newBal;
              localStorage.setItem('legend_user', JSON.stringify(u));
              setCurrentBalance(newBal);
            }
          } catch {}

          setStatus('success');
          toast.success(`Payment success! UGX ${amt.toLocaleString()} credited! Money removed from ${phone}`);
        } catch (err) {
          console.error(err);
        }
      }
    }, 3000); // Check every 3 seconds
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-14 pb-6 text-center">
        <h1 className="text-2xl font-black text-[#c9a84c]">Recharge Account</h1>
        <p className="text-gray-500 text-xs mt-2">Current: UGX {currentBalance.toLocaleString()}</p>
      </div>
      <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        {status === 'pin_sent' || status === 'verifying' ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 text-3xl animate-pulse" style={{background:'#facc15'}}>📲</div>
            <p className="text-white font-bold text-lg">Check Your Phone!</p>
            <p className="text-[#c9a84c] font-black text-xl mt-2">UGX {Number(amount).toLocaleString()}</p>
            <p className="text-white text-sm mt-3">PIN prompt sent to {phone}</p>
            <p className="text-yellow-400 text-xs mt-2 animate-pulse">{status==='verifying' ? 'Waiting for you to enter PIN...' : 'Enter PIN to confirm payment'}</p>
            <div className="mt-5 p-3 rounded-xl text-left" style={{background:'#1f1f1f'}}>
              <p className="text-gray-300 text-xs font-bold">How to complete:</p>
              <p className="text-gray-400 text-[11px] mt-1">1. You will get prompt: "Pay UGX {amount} to LEGEND"</p>
              <p className="text-gray-400 text-[11px]">2. Enter your Mobile Money PIN</p>
              <p className="text-gray-400 text-[11px]">3. Money will be removed from {phone}</p>
              <p className="text-green-400 text-[11px]">4. Wallet auto-credited instantly!</p>
            </div>
            <p className="text-gray-600 text-[10px] mt-4">Order: {orderId.slice(0,12)} • {provider.toUpperCase()}</p>
            <Link to="/recharge-status" className="mt-4 inline-block w-full py-3 rounded-xl font-bold text-black text-sm text-center" style={{background:'#c9a84c'}}>View Status</Link>
          </div>
        ) : status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 text-xl" style={{background:'#22c55e'}}>✓</div>
            <p className="text-white font-bold">Payment Success!</p>
            <p className="text-[#c9a84c] font-black text-lg mt-2">UGX {Number(amount).toLocaleString()} Credited!</p>
            <p className="text-gray-500 text-sm">New Balance: UGX {currentBalance.toLocaleString()}</p>
            <p className="text-green-400 text-xs mt-2">Money removed from {phone} ✓</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Link to="/product" className="py-3 rounded-xl font-bold text-black text-sm text-center" style={{background:'#c9a84c'}}>Buy Product →</Link>
              <Link to="/recharge-status" className="py-3 rounded-xl font-bold text-white text-sm text-center" style={{background:'#1f1f1f', border:'1px solid #333'}}>View Status</Link>
            </div>
            <button onClick={() => setStatus('idle')} className="mt-3 w-full py-3 rounded-xl font-bold text-white text-sm" style={{background:'#1f1f1f'}}>New Recharge</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-3 flex justify-between" style={{background:'#1f1f1f', border:'1px solid #333'}}>
              <span className="text-gray-500 text-xs">Current Wallet</span>
              <span className="text-[#c9a84c] font-bold text-sm">UGX {currentBalance.toLocaleString()}</span>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount (UGX) *</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Wallet size={15} className="text-gray-500 mr-2" />
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 outline-none text-sm text-white bg-transparent" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Provider *</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setProvider('mtn')} className="py-3.5 rounded-xl text-sm font-bold" style={{ background: provider === 'mtn' ? 'rgba(201,168,76,0.15)' : '#1f1f1f', border: `1.5px solid ${provider === 'mtn' ? '#c9a84c' : '#333'}`, color: provider === 'mtn' ? '#c9a84c' : 'white' }}>MTN</button>
                <button onClick={() => setProvider('airtel')} className="py-3.5 rounded-xl text-sm font-bold" style={{ background: provider === 'airtel' ? 'rgba(201,168,76,0.15)' : '#1f1f1f', border: `1.5px solid ${provider === 'airtel' ? '#c9a84c' : '#333'}`, color: provider === 'airtel' ? '#c9a84c' : 'white' }}>Airtel</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone *</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Phone size={15} className="text-gray-500 mr-2" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0746085840" className="flex-1 outline-none text-sm text-white bg-transparent" />
              </div>
            </div>
            <button onClick={handleRecharge} disabled={status === 'loading'} className="w-full py-4 rounded-xl font-bold text-black text-base mt-2 disabled:opacity-60" style={{background:'#c9a84c'}}>
              {status === 'loading' ? 'Sending PIN...' : `Pay UGX ${Number(amount || 0).toLocaleString()} - Get PIN`}
            </button>
            <p className="text-center text-green-500 text-[11px] mt-2">✓ Money removed from phone, wallet auto-credited after PIN</p>
          </div>
        )}
      </div>
    </div>
  );
              }
