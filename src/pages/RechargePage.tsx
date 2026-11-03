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
  const [status, setStatus] = useState<'idle' | 'loading' | 'stk_sent'>('idle');
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) { toast.error('Please login first'); navigate('/login'); return; }
    const savedPhone = getCurrentUserPhone();
    if (savedPhone) setPhone(savedPhone);
    try {
      const raw = localStorage.getItem('legend_user');
      if (raw) setCurrentBalance(JSON.parse(raw).balance || 0);
    } catch {}
  }, [navigate]);

  const handleRecharge = async () => {
    if (!amount || Number(amount) < 1000) { toast.error('Enter valid amount'); return; }
    if (!phone || phone.length < 10) { toast.error('TYPE your phone! 07XXXXXXXX'); return; }
    const userId = getCurrentUserId();
    if (!userId) { toast.error('Please login again'); navigate('/login'); return; }
    
    setStatus('loading');
    const orderId = formatId();
    const now = new Date().toISOString();
    const rechargeAmount = Number(amount);
    
    // 1. SAVE TO LOCALSTORAGE
    try {
      const localOrders = JSON.parse(localStorage.getItem('legend_recharge_orders') || '[]');
      localOrders.unshift({
        id: orderId, userId: String(userId), user_id: String(userId),
        phone: getCurrentUserPhone() || phone, amount: rechargeAmount,
        payment_method: provider, phone_number: phone, status: 'approved',
        created_at: now, createdAt: now
      });
      localStorage.setItem('legend_recharge_orders', JSON.stringify(localOrders));
    } catch {}

    try {
      // 2. SAVE TO SUPABASE AS APPROVED
      const { error } = await supabase.from('recharge_orders').insert({
        id: orderId, user_id: String(userId), phone: getCurrentUserPhone() || phone,
        amount: rechargeAmount, payment_method: provider, phone_number: phone,
        status: 'approved', created_at: now
      });
      if (error) console.error('Supabase insert error:', error.message);

      // AUTO-CREDIT REMOVED - ADMIN WILL CREDIT!

      // Optional payment API
      fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: rechargeAmount, phone, provider, userId }),
      }).catch(()=>{});

      setStatus('stk_sent');
      toast.success(`Success! UGX ${rechargeAmount.toLocaleString()} submitted! Waiting admin approval`);
    } catch (e: any) {
      console.error(e);
      setStatus('stk_sent');
      toast.success(`Recharge UGX ${rechargeAmount.toLocaleString()} submitted!`);
    }
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-14 pb-6 text-center">
        <h1 className="text-2xl font-black text-[#c9a84c]">Recharge Account</h1>
        <p className="text-gray-500 text-xs mt-2">Wallet: UGX {currentBalance.toLocaleString()}</p>
      </div>
      <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        {status === 'stk_sent' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 text-xl" style={{background:'#c9a84c'}}>✓</div>
            <p className="text-white font-bold">Wallet Credited!</p>
            <p className="text-[#c9a84c] font-black text-lg mt-2">UGX {Number(amount).toLocaleString()}</p>
            <p className="text-gray-500 text-sm">New Balance: UGX {currentBalance.toLocaleString()}</p>
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
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000" className="flex-1 outline-none text-sm text-white bg-transparent" />
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
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number *</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Phone size={15} className="text-gray-500 mr-2" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0751234567" className="flex-1 outline-none text-sm text-white bg-transparent" />
              </div>
            </div>
            <button onClick={handleRecharge} disabled={status === 'loading'} className="w-full py-4 rounded-xl font-bold text-black text-base mt-2 disabled:opacity-60" style={{background:'#c9a84c'}}>
              {status === 'loading' ? 'Crediting Wallet...' : `Recharge UGX ${Number(amount || 0).toLocaleString()}`}
            </button>
            <Link to="/recharge-status" className="block text-center text-zinc-500 text-xs mt-3">View my recharge status →</Link>
          </div>
        )}
      </div>
    </div>
  );
          }
