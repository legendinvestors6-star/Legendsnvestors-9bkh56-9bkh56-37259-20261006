import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [recharges, setRecharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const loadRecharges = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('recharge_orders').select('*').order('created_at', { ascending: false });
    if (!error && data) setRecharges(data);
    setLoading(false);
  };

  useEffect(() => { loadRecharges(); }, []);

  // APPROVE AND CREDIT WALLET IMMEDIATELY!
  const handleApprove = async (order: any) => {
    const confirm = window.confirm(`Approve UGX ${Number(order.amount).toLocaleString()} for user ${order.user_id}? Wallet will be credited immediately!`);
    if (!confirm) return;

    try {
      // 1. Get current user balance
      const { data: userData, error: userError } = await supabase.from('users').select('balance, phone').eq('id', order.user_id).single();
      if (userError) { toast.error('User not found: ' + userError.message); return; }

      const oldBalance = Number(userData?.balance || 0);
      const rechargeAmount = Number(order.amount);
      const newBalance = oldBalance + rechargeAmount;

      // 2. Update recharge status to approved
      const { error: statusError } = await supabase.from('recharge_orders').update({ status: 'approved' }).eq('id', order.id);
      if (statusError) { toast.error('Failed to approve: ' + statusError.message); return; }

      // 3. CREDIT WALLET IN SUPABASE
      const { error: balanceError } = await supabase.from('users').update({ balance: newBalance }).eq('id', order.user_id);
      if (balanceError) { toast.error('Status approved but wallet credit failed: ' + balanceError.message + ' - Run SQL to allow'); }
      
      // 4. Update local list
      setRecharges(prev => prev.map(r => r.id === order.id ? { ...r, status: 'approved' } : r));
      
      toast.success(`✅ APPROVED! UGX ${rechargeAmount.toLocaleString()} credited! User balance: UGX ${oldBalance.toLocaleString()} → UGX ${newBalance.toLocaleString()}`);
      
    } catch (e:any) {
      toast.error('Approve failed: ' + e.message);
    }
  };

  const handleReject = async (order: any) => {
    if (!window.confirm(`Reject UGX ${Number(order.amount).toLocaleString()}?`)) return;
    const { error } = await supabase.from('recharge_orders').update({ status: 'rejected' }).eq('id', order.id);
    if (!error) {
      setRecharges(prev => prev.map(r => r.id === order.id ? { ...r, status: 'rejected' } : r));
      toast.success('Rejected');
    }
  };

  const filtered = recharges.filter(r => filter === 'all' ? true : r.status === filter);
  const pendingCount = recharges.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen p-4" style={{background:'#0a0a0a'}}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-black text-[#c9a84c]">LEGEND Admin Panel</h1>
        <p className="text-gray-500 text-xs mt-1">Approve recharges → Auto credit wallet</p>
        
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="rounded-xl p-3" style={{background:'#151515', border:'1px solid #2a2a2a'}}>
            <p className="text-gray-500 text-xs">Total Recharges</p>
            <p className="text-white font-black text-lg">{recharges.length}</p>
            <p className="text-gray-600 text-[10px]">in DB: {recharges.length}</p>
          </div>
          <div className="rounded-xl p-3" style={{background:'rgba(250,204,21,0.1)', border:'1px solid #facc15'}}>
            <p className="text-yellow-400 text-xs">Pending</p>
            <p className="text-yellow-400 font-black text-lg">{pendingCount}</p>
          </div>
          <div className="rounded-xl p-3" style={{background:'#151515', border:'1px solid #2a2a2a'}}>
            <p className="text-gray-500 text-xs">Approved Total</p>
            <p className="text-green-400 font-black text-lg">UGX {recharges.filter(r=>r.status==='approved').reduce((s,r)=>s+Number(r.amount),0).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-6 overflow-x-auto">
          {(['pending','approved','rejected','all'] as const).map(f => (
            <button key={f} onClick={()=>setFilter(f)} className="px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap" style={{background: filter===f?'#c9a84c':'#1f1f1f', color: filter===f?'black':'white', border:'1px solid #333'}}>
              {f} ({f==='all'?recharges.length:recharges.filter(r=>r.status===f).length})
            </button>
          ))}
          <button onClick={loadRecharges} className="px-4 py-2 rounded-full text-xs font-bold" style={{background:'#1f1f1f', color:'white', border:'1px solid #333'}}>↻ Refresh</button>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? <p className="text-gray-500 text-sm">Loading...</p> : filtered.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{background:'#151515', border:'1px solid #2a2a2a'}}>
              <p className="text-gray-500">No {filter} recharges</p>
            </div>
          ) : filtered.map(order => (
            <div key={order.id} className="rounded-xl p-4" style={{background:'#151515', border:'1px solid #2a2a2a'}}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-bold">UGX {Number(order.amount).toLocaleString()} <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${order.status==='pending'?'bg-yellow-500/20 text-yellow-400':order.status==='approved'?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}`}>{order.status.toUpperCase()}</span></p>
                  <p className="text-gray-500 text-xs mt-1">User: {order.user_id} • Phone: {order.phone_number || order.phone} • {order.payment_method}</p>
                  <p className="text-gray-600 text-[11px] mt-1">ID: {order.id} • {new Date(order.created_at).toLocaleString()}</p>
                </div>
                {order.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={()=>handleApprove(order)} className="px-4 py-2 rounded-xl font-bold text-black text-xs" style={{background:'#22c55e'}}>APPROVE + CREDIT</button>
                    <button onClick={()=>handleReject(order)} className="px-3 py-2 rounded-xl font-bold text-white text-xs" style={{background:'#ef4444'}}>Reject</button>
                  </div>
                )}
                {order.status === 'approved' && <p className="text-green-400 text-xs font-bold">✓ Wallet Credited</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl p-4" style={{background:'#1a1a1a', border:'1px solid #333'}}>
          <p className="text-white font-bold text-xs">How it works:</p>
          <p className="text-gray-500 text-[11px] mt-1">1. User submits recharge → status PENDING, wallet 0</p>
          <p className="text-gray-500 text-[11px]">2. You click APPROVE + CREDIT → status APPROVED + user balance += amount</p>
          <p className="text-gray-500 text-[11px]">3. User can now buy product with wallet!</p>
          <p className="text-yellow-400 text-[11px] mt-2">If approve fails to credit: Run SQL in Supabase → ALTER TABLE users DISABLE ROW LEVEL SECURITY; then ENABLE and create policy allow_all</p>
        </div>
      </div>
    </div>
  );
                              }
