import { useState } from 'react';
import { toast } from 'sonner';
import { Gift, Phone, Wallet, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';

const formatId = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.id || null;
    }
    return localStorage.getItem('legend_current_user') || localStorage.getItem('user_id');
  } catch { return null; }
}

function getCurrentUserPhone(): string {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.phone || '';
    }
    const raw2 = localStorage.getItem('user');
    if (raw2) {
      const u = JSON.parse(raw2);
      return u.phone || '';
    }
  } catch {}
  return localStorage.getItem('phone') || '';
}

export default function RechargePage() {
  const [amount, setAmount] = useState('30000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel');
  const [status, setStatus] = useState<'idle' | 'loading' | 'stk_sent'>('idle');

  const handleRecharge = async () => {
    if (!amount || !phone) { toast.error('Fill amount and phone'); return; }
    if (Number(amount) < 10000) { toast.error('Minimum UGX 10,000'); return; }
    
    const userId = getCurrentUserId();
    if (!userId) { toast.error('Please login again'); return; }
    
    setStatus('loading');
    try {
      // 1. Try payment API (optional - even if fails we still save)
      let apiSuccess = false;
      try {
        const res = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Number(amount), phone, provider, userId }),
        });
        const data = await res.json();
        apiSuccess = data.success || data.status === 'pending';
      } catch (apiErr) {
        console.log('Payment API error, but will still save to Supabase');
      }
      
      // 2. SAVE TO SUPABASE - THIS IS WHAT ADMIN SEES!
      const orderId = formatId();
      const { error } = await supabase.from('recharge_orders').insert({
        id: orderId,
        user_id: userId,
        phone: getCurrentUserPhone() || phone,
        amount: Number(amount),
        payment_method: provider,
        phone_number: phone,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Supabase save error:', error);
        toast.error('Failed to save: ' + error.message + ' - Run SQL to disable RLS');
        setStatus('idle');
        return;
      }

      setStatus('stk_sent');
      toast.success(apiSuccess ? 'STK sent! Check your phone' : 'Recharge submitted! Admin will approve');
      
    } catch (e: any) {
      console.error(e);
      // Final fallback - try one more time
      try {
        const userId = getCurrentUserId();
        if (userId) {
          const { error } = await supabase.from('recharge_orders').insert({
            id: formatId(),
            user_id: userId,
            phone: getCurrentUserPhone() || phone,
            amount: Number(amount),
            payment_method: provider,
            phone_number: phone,
            status: 'pending',
            created_at: new Date().toISOString()
          });
          if (!error) {
            setStatus('stk_sent');
            toast.success('Recharge submitted! Admin will see it');
            return;
          }
        }
      } catch {}
      toast.error('Network error - try again');
      setStatus('idle');
    }
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-14 pb-6 text-center">
        <h1 className="text-2xl font-black text-[#c9a84c]">Recharge Account</h1>
        <p className="text-gray-500 text-xs mt-2">Add funds to your account</p>
        <Link to="/recharge-status" className="inline-flex items-center gap-1 text-[#c9a84c] text-xs mt-3 font-bold">
          <Eye size={12} /> View My Recharge Status
        </Link>
      </div>

      <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        {status === 'stk_sent' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 text-xl font-bold" style={{background:'#c9a84c', color:'black'}}>✓</div>
            <p className="text-white font-bold text-lg">Recharge Submitted!</p>
            <p className="text-gray-400 text-sm mt-2">Amount: UGX {Number(amount).toLocaleString()}</p>
            <p className="text-gray-500 text-xs mt-1">Phone: {phone} • {provider.toUpperCase()}</p>
            <p className="text-[#c9a84c] text-xs mt-3 bg-[#c9a84c]/10 py-2 px-3 rounded-xl">Admin can see it now - waiting for approval</p>
            
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Link to="/recharge-status" className="py-3.5 rounded-xl font-bold text-black text-sm text-center" style={{background:'#c9a84c'}}>
                View Status
              </Link>
              <button onClick={() => setStatus('idle')} className="py-3.5 rounded-xl font-bold text-white text-sm" style={{background:'#1f1f1f', border:'1px solid #333'}}>
                New Recharge
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount (UGX)</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Wallet size={15} className="text-gray-500 mr-2" />
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
              </div>
              <p className="text-[11px] text-gray-600 mt-1">Minimum UGX 10,000 • Max UGX 1,500,000</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Provider</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setProvider('mtn')} className="py-3.5 rounded-xl text-sm font-bold transition-all" style={{ background: provider === 'mtn' ? 'rgba(201,168,76,0.15)' : '#1f1f1f', border: `1.5px solid ${provider === 'mtn' ? '#c9a84c' : '#333'}`, color: provider === 'mtn' ? '#c9a84c' : 'white' }}>MTN</button>
                <button onClick={() => setProvider('airtel')} className="py-3.5 rounded-xl text-sm font-bold transition-all" style={{ background: provider === 'airtel' ? 'rgba(201,168,76,0.15)' : '#1f1f1f', border: `1.5px solid ${provider === 'airtel' ? '#c9a84c' : '#333'}`, color: provider === 'airtel' ? '#c9a84c' : 'white' }}>Airtel Uganda</button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number (where STK will be sent)</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Phone size={15} className="text-gray-500 mr-2" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
              </div>
            </div>

            <button onClick={handleRecharge} disabled={status === 'loading'} className="w-full py-4 rounded-xl font-bold text-black text-base mt-2 disabled:opacity-60" style={{background:'#c9a84c'}}>
              {status === 'loading' ? 'Submitting...' : `Recharge UGX ${Number(amount || 0).toLocaleString()}`}
            </button>
            
            <Link to="/recharge-status" className="block text-center text-zinc-500 text-xs mt-3">Check previous recharges status →</Link>
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
}
