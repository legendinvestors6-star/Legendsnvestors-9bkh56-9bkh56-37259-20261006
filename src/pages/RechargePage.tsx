import { useState } from 'react';
import { toast } from 'sonner';
import { Gift, Phone, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const formatId = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.id || null;
    }
    const id = localStorage.getItem('legend_current_user');
    return id;
  } catch { return null; }
}

function getCurrentUserPhone(): string {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.phone || '';
    }
  } catch {}
  return '';
}

export default function RechargePage() {
  const [amount, setAmount] = useState('30000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel');
  const [status, setStatus] = useState<'idle' | 'loading' | 'stk_sent'>('idle');

  const handleRecharge = async () => {
    if (!amount || !phone) { toast.error('Fill amount and phone'); return; }
    const userId = getCurrentUserId();
    if (!userId) { toast.error('Please login again'); return; }
    
    setStatus('loading');
    try {
      // 1. Call your payment API (STK)
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), phone, provider, userId }),
      });
      const data = await res.json();
      
      // 2. SAVE TO SUPABASE SO ADMIN CAN SEE IT!
      const orderId = formatId();
      const { error } = await supabase.from('recharge_orders').insert({
        id: orderId,
        user_id: userId,
        phone: getCurrentUserPhone() || phone,
        amount: Number(amount),
        payment_method: provider,
        phone_number: phone,
        status: data.status === 'pending' || data.success ? 'pending' : 'pending',
        created_at: new Date().toISOString()
      });

      if (error) {
        console.log('Supabase save error:', error.message);
        // Still show success because STK might have worked, but log error
      }

      if (data.status === 'pending' || data.success || !error) {
        setStatus('stk_sent');
        toast.success('STK sent! Check your phone - Admin will see it');
      } else {
        // Even if API fails, we saved it as pending so admin sees it
        if (!error) {
          setStatus('stk_sent');
          toast.success('Recharge submitted! Admin will approve');
        } else {
          toast.error(data.message || 'Failed');
          setStatus('idle');
        }
      }
    } catch (e: any) {
      // Network error but try to save to supabase anyway
      try {
        const userId = getCurrentUserId();
        if (userId) {
          await supabase.from('recharge_orders').insert({
            id: formatId(),
            user_id: userId,
            phone: getCurrentUserPhone(),
            amount: Number(amount),
            payment_method: provider,
            phone_number: phone,
            status: 'pending',
            created_at: new Date().toISOString()
          });
          setStatus('stk_sent');
          toast.success('Recharge submitted! Admin will see it');
          return;
        }
      } catch {}
      toast.error('Network error');
      setStatus('idle');
    }
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-14 pb-6 text-center">
        <h1 className="text-2xl font-black text-[#c9a84c]">Recharge Account</h1>
        <p className="text-gray-500 text-xs mt-2">Add funds to a phone number instantly</p>
      </div>

      <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        {status === 'stk_sent' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{background:'#c9a84c'}}>⏳</div>
            <p className="text-white font-bold">STK sent! Enter PIN on phone</p>
            <p className="text-gray-500 text-sm mt-2">Check {phone} and confirm payment</p>
            <p className="text-[#c9a84c] text-xs mt-2">Admin can now see your recharge!</p>
            <button onClick={() => setStatus('idle')} className="mt-6 text-[#c9a84c] text-sm font-semibold">Recharge again</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount (UGX)</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Wallet size={15} className="text-gray-500 mr-2" />
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
              </div>
              <p className="text-[11px] text-gray-600 mt-1">Minimum UGX 30000 • Max UGX 1,500,000</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Provider</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setProvider('mtn')} className="py-3.5 rounded-xl text-sm font-bold" style={{ background: provider === 'mtn' ? 'rgba(201,168,76,0.15)' : '#1f1f1f', border: `1.5px solid ${provider === 'mtn' ? '#c9a84c' : '#333'}`, color: provider === 'mtn' ? '#c9a84c' : 'white' }}>MTN</button>
                <button onClick={() => setProvider('airtel')} className="py-3.5 rounded-xl text-sm font-bold" style={{ background: provider === 'airtel' ? 'rgba(201,168,76,0.15)' : '#1f1f1f', border: `1.5px solid ${provider === 'airtel' ? '#c9a84c' : '#333'}`, color: provider === 'airtel' ? '#c9a84c' : 'white' }}>Airtel Uganda</button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Phone size={15} className="text-gray-500 mr-2" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXXXX" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
              </div>
            </div>

            <button onClick={handleRecharge} disabled={status === 'loading'} className="w-full py-4 rounded-xl font-bold text-black text-base mt-2 disabled:opacity-60" style={{background:'#c9a84c'}}>
              {status === 'loading' ? 'Waiting for PIN...' : 'Recharge'}
            </button>
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
}
