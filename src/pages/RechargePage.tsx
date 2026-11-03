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

export default function RechargePage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('30000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel');
  const [status, setStatus] = useState<'idle' | 'loading' | 'stk_sent'>('idle');

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) { navigate('/login'); return; }
    const savedPhone = getCurrentUserPhone();
    if (savedPhone) setPhone(savedPhone);
  }, [navigate]);

  const handleRecharge = async () => {
    if (!amount || Number(amount) < 1000) { toast.error('Enter valid amount'); return; }
    if (!phone || phone.length < 10) { toast.error('TYPE phone 07XXXXXXXX'); return; }
    const userId = getCurrentUserId();
    if (!userId) { navigate('/login'); return; }
    setStatus('loading');
    const orderId = formatId();
    const now = new Date().toISOString();
    
    // SAVE LOCAL AS PENDING
    try {
      const localOrders = JSON.parse(localStorage.getItem('legend_recharge_orders') || '[]');
      localOrders.unshift({
        id: orderId, userId: String(userId), user_id: String(userId),
        phone: getCurrentUserPhone() || phone, amount: Number(amount),
        payment_method: provider, phone_number: phone, status: 'pending',
        created_at: now, createdAt: now
      });
      localStorage.setItem('legend_recharge_orders', JSON.stringify(localOrders));
    } catch {}

    try {
      // SAVE SUPABASE AS PENDING - ADMIN WILL APPROVE!
      const { error } = await supabase.from('recharge_orders').insert({
        id: orderId, user_id: String(userId), phone: getCurrentUserPhone() || phone,
        amount: Number(amount), payment_method: provider, phone_number: phone,
        status: 'pending', created_at: now
      });
      if (error) console.error('Insert error:', error.message);
      
      setStatus('stk_sent');
      toast.success(`Recharge UGX ${Number(amount).toLocaleString()} submitted! Waiting admin approval`);
    } catch (e:any) {
      setStatus('stk_sent');
      toast.success('Submitted! Waiting approval');
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-14 pb-6 text-center">
        <h1 className="text-2xl font-black text-[#c9a84c]">Recharge Account</h1>
        <p className="text-gray-500 text-xs mt-2">Funds credited after admin approval</p>
      </div>
      <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        {status === 'stk_sent' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 text-xl" style={{background:'#facc15'}}>⏳</div>
            <p className="text-white font-bold">Submitted - Pending Approval!</p>
            <p className="text-gray-500 text-sm mt-2">UGX {Number(amount).toLocaleString()} to {phone}</p>
            <p className="text-yellow-400 text-xs mt-2">Admin will approve and credit your wallet</p>
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
            <div><label className="text-xs text-gray-500 mb-1.5 block">Phone *</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Phone size={15} className="text-gray-500 mr-2" /><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0751234567" className="flex-1 outline-none text-sm text-white bg-transparent" />
              </div></div>
            <button onClick={handleRecharge} disabled={status === 'loading'} className="w-full py-4 rounded-xl font-bold text-black text-base mt-2" style={{background:'#c9a84c'}}>{status === 'loading' ? 'Submitting...' : `Recharge UGX ${Number(amount || 0).toLocaleString()}`}</button>
            <Link to="/recharge-status" className="block text-center text-zinc-500 text-xs mt-3">View my recharge status →</Link>
          </div>
        )}
      </div>
    </div>
  );
        }
