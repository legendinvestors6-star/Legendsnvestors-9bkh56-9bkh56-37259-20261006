import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Phone, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

const formatId = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
function getCurrentUserId(): string | null {
  try { const raw = localStorage.getItem('legend_user'); if (raw) return JSON.parse(raw).id; return localStorage.getItem('legend_current_user') || localStorage.getItem('user_id'); } catch { return null; }
}
function getCurrentUserPhone(): string {
  try { const raw = localStorage.getItem('legend_user'); if (raw) return JSON.parse(raw).phone || ''; } catch {} return localStorage.getItem('phone') || '';
}

// PESAJET CONFIG - PUT YOUR KEYS HERE!
const PESAJET_API_URL = 'https://api.pesajet.com/api/v1/payments/request-to-pay';
const PESAJET_API_KEY = 'YOUR_PESAJET_API_KEY'; // Get from Pesajet dashboard
const PESAJET_SECRET = 'YOUR_PESAJET_SECRET';

export default function RechargePage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('30000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel');
  const [status, setStatus] = useState<'idle' | 'loading' | 'stk_sent' | 'checking'>('idle');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) { navigate('/login'); return; }
    const savedPhone = getCurrentUserPhone();
    if (savedPhone) setPhone(savedPhone);
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
    const cleanPhone = phone.startsWith('0') ? '256' + phone.slice(1) : phone;

    try {
      // 1. SAVE AS PENDING IN SUPABASE FIRST
      await supabase.from('recharge_orders').insert({
        id: newOrderId, user_id: String(userId), phone: getCurrentUserPhone() || phone,
        amount: Number(amount), payment_method: provider, phone_number: phone,
        status: 'pending', created_at: now, transaction_id: newOrderId
      });

      // 2. CALL PESAJET API TO TRIGGER PIN PROMPT!
      // OPTION A: Direct call (if Pesajet allows frontend) - TRY THIS FIRST
      const pesajetPayload = {
        amount: Number(amount),
        phone: cleanPhone,
        provider: provider, // mtn or airtel
        reference: newOrderId,
        currency: 'UGX',
        description: `LEGEND Recharge UGX ${amount}`,
        callback_url: `https://your-project.supabase.co/functions/v1/pesajet-callback`
      };

      // Try via Supabase Edge Function (RECOMMENDED - hides secret)
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('pesajet-pay', {
        body: pesajetPayload
      });

      if (edgeError) {
        // Fallback: Try direct Pesajet call
        console.log('Edge function not found, trying direct Pesajet...');
        const directRes = await fetch(PESAJET_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PESAJET_API_KEY}`,
            'X-Api-Secret': PESAJET_SECRET
          },
          body: JSON.stringify(pesajetPayload)
        });
        const directJson = await directRes.json();
        console.log('Pesajet response:', directJson);
        
        if (!directRes.ok) throw new Error(directJson.message || 'Pesajet failed');
      } else {
        console.log('Pesajet edge response:', edgeData);
      }

      setStatus('stk_sent');
      toast.success(`PIN Prompt sent to ${phone}! Enter PIN to approve UGX ${Number(amount).toLocaleString()}`);
      
      // 3. START POLLING FOR PAYMENT STATUS (auto-credit when user enters PIN)
      startPolling(newOrderId, String(userId), Number(amount));

    } catch (e:any) {
      console.error('Recharge error:', e);
      // Even if Pesajet fails, keep as pending for manual admin approval
      setStatus('stk_sent');
      toast.success(`Submitted! If no PIN, wait for admin approval. Order: ${newOrderId}`);
      startPolling(newOrderId, String(userId), Number(amount));
    }
  };

  const startPolling = (oid: string, uid: string, amt: number) => {
    setStatus('checking');
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) { clearInterval(interval); setStatus('stk_sent'); return; } // Stop after 2.5 mins
      
      const { data: order } = await supabase.from('recharge_orders').select('status').eq('id', oid).single();
      if (order?.status === 'approved') {
        clearInterval(interval);
        // Auto-credit wallet!
        const { data: userData } = await supabase.from('users').select('balance').eq('id', uid).maybeSingle();
        const newBal = Number(userData?.balance || 0) + amt;
        await supabase.from('users').update({ balance: newBal }).eq('id', uid);
        toast.success(`Payment confirmed! Wallet credited UGX ${amt.toLocaleString()}!`);
        setStatus('idle');
      }
    }, 5000); // Check every 5 seconds
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-14 pb-6 text-center">
        <h1 className="text-2xl font-black text-[#c9a84c]">Recharge Account</h1>
        <p className="text-gray-500 text-xs mt-2">{status==='checking' ? 'Waiting for PIN confirmation...' : 'You will receive PIN prompt on your phone'}</p>
      </div>
      <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        {status === 'stk_sent' || status === 'checking' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 text-2xl animate-pulse" style={{background: status==='checking' ? '#22c55e' : '#facc15'}}>{status==='checking' ? '📲' : '⏳'}</div>
            <p className="text-white font-bold">{status==='checking' ? 'Check your phone for PIN!' : 'PIN Prompt Sent!'}</p>
            <p className="text-gray-400 text-sm mt-2">UGX {Number(amount).toLocaleString()} to {phone}</p>
            <p className="text-yellow-400 text-xs mt-2">{status==='checking' ? `Enter PIN on your phone to complete. Order: ${orderId.slice(0,8)}` : `Dial *...# or check SMS for PIN prompt`}</p>
            <div className="mt-4 p-3 rounded-xl" style={{background:'#1f1f1f'}}>
              <p className="text-gray-500 text-[11px]">Didn't get PIN?</p>
              <p className="text-gray-400 text-[11px] mt-1">1. Check network • 2. Ensure phone has Mobile Money • 3. Try MTN/Airtel again</p>
            </div>
            <Link to="/recharge-status" className="mt-6 inline-block w-full py-3 rounded-xl font-bold text-black text-sm text-center" style={{background:'#c9a84c'}}>View Status</Link>
            <button onClick={() => setStatus('idle')} className="mt-3 w-full py-3 rounded-xl font-bold text-white text-sm" style={{background:'#1f1f1f'}}>New Recharge</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div><label className="text-xs text-gray-500 mb-1.5 block">Amount (UGX) *</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Wallet size={15} className="text-gray-500 mr-2" /><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 outline-none text-sm text-white bg-transparent" />
              </div></div>
            <div><label className="text-xs text-gray-500 mb-1.5 block">Provider *</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setProvider('mtn')} className="py-3.5 rounded-xl text-sm font-bold" style={{ background: provider === 'mtn' ? 'rgba(201,168,76,0.15)' : '#1f1f1f', border: `1.5px solid ${provider === 'mtn' ? '#c9a84c' : '#333'}`, color: provider === 'mtn' ? '#c9a84c' : 'white' }}>MTN</button>
                <button onClick={() => setProvider('airtel')} className="py-3.5 rounded-xl text-sm font-bold" style={{ background: provider === 'airtel' ? 'rgba(201,168,76,0.15)' : '#1f1f1f', border: `1.5px solid ${provider === 'airtel' ? '#c9a84c' : '#333'}`, color: provider === 'airtel' ? '#c9a84c' : 'white' }}>Airtel Uganda</button>
              </div></div>
            <div><label className="text-xs text-gray-500 mb-1.5 block">Phone (07XXXXXXXX) *</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Phone size={15} className="text-gray-500 mr-2" /><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0751234567" className="flex-1 outline-none text-sm text-white bg-transparent" />
              </div></div>
            <button onClick={handleRecharge} disabled={status === 'loading'} className="w-full py-4 rounded-xl font-bold text-black text-base mt-2" style={{background:'#c9a84c'}}>{status === 'loading' ? 'Sending PIN prompt...' : `Pay UGX ${Number(amount || 0).toLocaleString()} - Get PIN`}</button>
            <p className="text-center text-gray-600 text-[11px] mt-2">Powered by Pesajet • You will receive PIN on {phone || 'your phone'}</p>
            <Link to="/recharge-status" className="block text-center text-zinc-500 text-xs mt-3">View my recharge status →</Link>
          </div>
        )}
      </div>
    </div>
  );
      }
