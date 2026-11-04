import { useState, useEffect } from 'react';
import { Users, CreditCard, ArrowDownToLine, BarChart3, Search, LogOut, Shield, Gift, DollarSign, Trash2, Package, Clock, TrendingUp, Wallet, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getUsers, getRechargeOrders, getWithdrawOrders, getUserProducts, approveRechargeOrder, rejectRechargeOrder, approveWithdrawOrder, rejectWithdrawOrder, setCurrentUser, formatUGX, updateUser, saveUsers, getGiftCodes, createGiftCode, deleteGiftCode, getPasswordResets, approvePasswordReset, rejectPasswordReset, getTransactions } from '@/lib/storage';
import type { PasswordResetRequest } from '@/lib/storage';
import { PRODUCTS } from '@/constants/products';
import { createClient } from '@supabase/supabase-js';

// ===== FIXED - HARDCODE YOUR KEYS HERE IF VERCEL ENV MISSING =====
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';
const supabase = createClient(supabaseUrl, supabaseKey);

type AdminTab = 'pesajet' | 'overview' | 'users' | 'recharge' | 'withdraw' | 'products' | 'gifts' | 'resets';

function PesaJetTab({ onRefresh }: { onRefresh: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<any>({});
  
  const load = async () => {
    setLoading(true);
    let combined: any[] = [];
    let errorMsg = '';
    try {
      // FIXED - Remove product_name filter - Show ALL pending!
      const { data, error } = await supabase.from('investment_packages').select('*').eq('status','pending').order('submitted_at',{ascending:false}).limit(100);
      if(error){
        errorMsg = error.message;
        console.error('Supabase error:', error);
      } else if(data){
        combined = data.map((d:any) => ({ 
          id: d.id, 
          userId: d.user_id, 
          amount: Number(d.amount), 
          paymentMethod: d.payment_method || 'MTN', 
          phoneNumber: d.phone_number || '', 
          status: d.status, 
          createdAt: d.submitted_at || d.created_at, 
          source: 'SUPABASE' 
        }));
      }
    } catch(e:any){ errorMsg = e.message; }
    try {
      const local = getRechargeOrders().filter(o=>o.status==='pending').map((o:any)=>({ ...o, source:'LOCAL' }));
      combined = [...combined, ...local];
      setDebug({ local: local.length, supa: combined.filter((o:any)=>o.source==='SUPABASE').length, error: errorMsg, hasEnv: !!supabaseUrl && supabaseUrl.includes('supabase.co') });
    } catch {}
    const uniq = Array.from(new Map(combined.map((o:any)=>[o.id, o])).values());
    setOrders(uniq);
    setLoading(false);
  };

  useEffect(() => { load(); const i=setInterval(load, 5000); return ()=>clearInterval(i); }, []);
  
  return (
    <div className="space-y-3">
      {/* DEBUG - Shows why 0 */}
      <div className="rounded-xl p-2 text-[10px]" style={{ background: debug.error ? 'rgba(239,68,68,0.15)' : '#111', border: '1px solid #222' }}>
        <p className="text-gray-400">ENV: {debug.hasEnv ? '✅' : '❌ MISSING! Add in Vercel!'} | Local:{debug.local||0} Supa:{debug.supa||0}</p>
        {debug.error && <p className="text-red-400">{debug.error}</p>}
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.4)' }}>
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}><span className="text-black font-black text-xs">PesaJet</span></div><div><p className="text-white font-black text-sm">PesaJet Pay - Uses Recharge Table + Webhook</p><p className="text-[#c9a84c] text-[11px]">MTN 0756406186 • {orders.length} RECHARGE pending • Local:{debug.local||0} Supa:{debug.supa||0}</p></div></div>
      </div>
      <button onClick={load} className="w-full py-3 rounded-xl font-black text-black text-sm" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>{loading?'⏳ Checking...':`🔄 Refresh PesaJet (${orders.length}) - From Recharge`}</button>
      
      <button onClick={async()=>{
        const testId = 'test-'+Date.now();
        const { error } = await supabase.from('investment_packages').insert({
          id: testId, user_id: 'test-user', amount: 20000,
          product_name: 'RECHARGE', status: 'pending',
          payment_method: 'MTN', phone_number: '0756406186',
          submitted_at: new Date().toISOString()
        });
        if(error) toast.error('Insert failed: '+error.message+' - Run SQL!');
        else { toast.success('✅ Test 20k created! Refresh!'); load(); onRefresh(); }
      }} className="w-full py-2 rounded-xl text-xs text-white" style={{ background: '#065f46', border: '1px dashed #10b981' }}>🧪 Create TEST 20k (Click if Supa:0)</button>

      {orders.length===0?<div className="rounded-2xl p-10 text-center" style={{ background: '#111111', border: '1px dashed rgba(201,168,76,0.2)' }}><p className="text-gray-400 text-sm">No pending PesaJet payments</p><p className="text-gray-600 text-xs mt-2">When user recharges on ANY phone, webhook saves to Supabase and appears here</p></div>:orders.map((order:any)=>(
        <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.35)' }}>
          <div className="flex justify-between mb-2"><div><p className="text-white font-black">{formatUGX(order.amount)} - {order.paymentMethod} • {order.source}</p><p className="text-gray-400 text-xs">+256 {order.phoneNumber} • User: {order.userId?.slice(0,8)}</p></div><span className="text-[10px] px-2 py-1 rounded-full h-fit" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>PENDING</span></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={async()=>{
              if(!confirm(`Confirm ${formatUGX(order.amount)} from ${order.phoneNumber}?`)) return;
              if(order.source==='SUPABASE'){ 
                await supabase.from('investment_packages').update({status:'completed'}).eq('id',order.id); 
                const users=getUsers(); 
                const idx=users.findIndex(x=>x.id===order.userId); 
                if(idx!==-1){ users[idx].balance=Number(users[idx].balance||0)+Number(order.amount); saveUsers(users); } 
              } else { approveRechargeOrder(order.id); }
              toast.success('✅ PesaJet Confirmed!'); load(); onRefresh();
            }} className="py-3 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>💰 Manual Confirm</button>
            <button onClick={async()=>{ if(!confirm('Reject?')) return; if(order.source==='SUPABASE') await supabase.from('investment_packages').update({status:'rejected'}).eq('id',order.id); else rejectRechargeOrder(order.id); toast.success('Rejected'); load(); onRefresh(); }} className="py-3 rounded-xl text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [searchQ, setSearchQ] = useState('');
  const [refresh, setRefresh] = useState(0);
  const users = getUsers().filter(u => !u.isAdmin);
  const rechargeOrdersLocal = getRechargeOrders();
  const withdrawOrders = getWithdrawOrders();
  const userProducts = getUserProducts();
  const transactions = getTransactions();
  const [supaRecharge, setSupaRecharge] = useState<any[]>([]);
  const [supaAll, setSupaAll] = useState<any[]>([]);
  
  useEffect(()=>{ 
    (async()=>{ 
      try{ 
        const {data} = await supabase.from('investment_packages').select('*');
        setSupaAll(data||[]);
        setSupaRecharge((data||[]).filter((d:any)=>d.status==='pending'));
      }catch{} 
    })(); 
  },[refresh]);

  const pendingRechargeCount = rechargeOrdersLocal.filter(o=>o.status==='pending').length + supaRecharge.length;
  const pendingWithdraw = withdrawOrders.filter(o => o.status === 'pending');
  const passwordResets = getPasswordResets();
  
  // ===== FIXED 8 CARDS - Use Supabase + Local =====
  const totalUsers = users.length > 0 ? users.length : 0;
  const activePackages = userProducts.filter(p=>p.status==='active').length;
  const pendingPackages = pendingRechargeCount;
  const totalDeposits = rechargeOrdersLocal.filter(o=>o.status==='completed').reduce((s,o)=>s+Number(o.amount||0),0) + supaAll.filter((d:any)=>d.status==='completed').reduce((s:any,o:any)=>s+Number(o.amount||0),0);
  const totalWithdrawals = withdrawOrders.filter(o=>o.status==='completed').reduce((s,o)=>s+Number(o.amount||0),0);
  const pendingPayouts = withdrawOrders.filter(o=>o.status==='pending').reduce((s,o)=>s+Number(o.amount||0),0);
  const earningsDistributed = users.reduce((s,u)=>s+Number((u as any).cumulativeIncome||0),0) + transactions.filter(t=> (t as any).type==='daily-income' || (t as any).type==='bonus').reduce((s,t)=>s+Number((t as any).amount||0),0);
  const referralEarnings = users.reduce((s,u)=>s+Number((u as any).cumulativeIncome||0),0);

  const tabs = [
    { key: 'overview' as AdminTab, label: 'Overview', icon: BarChart3 },
    { key: 'pesajet' as AdminTab, label: 'PesaJet', icon: DollarSign, badge: pendingRechargeCount },
    { key: 'users' as AdminTab, label: 'Users', icon: Users, badge: users.length },
    { key: 'recharge' as AdminTab, label: 'Recharge', icon: CreditCard, badge: pendingRechargeCount },
    { key: 'withdraw' as AdminTab, label: 'Withdraw', icon: ArrowDownToLine, badge: pendingWithdraw.length },
    { key: 'products' as AdminTab, label: 'Products', icon: Package },
    { key: 'gifts' as AdminTab, label: 'Redeem Code', icon: Gift },
    { key: 'resets' as AdminTab, label: 'Resets', icon: Shield, badge: passwordResets.filter(r=>r.status==='pending').length },
  ];

  const getStatusStyle = (status:string) => status==='completed'?{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }:status==='pending'?{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }:{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' };

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <div className="flex items-center justify-between p-4" style={{ background: 'linear-gradient(135deg, #000000, #1a1100)', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}><Shield size={18} className="text-black"/></div><span className="text-white font-black">Admin Panel</span><span className="text-[9px] font-black text-black px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>GOLD • PESAJET • RECHARGE • WEBHOOK</span></div>
        <button onClick={()=>{setCurrentUser(null);navigate('/login');}} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><LogOut size={15} className="text-gray-400"/></button>
      </div>

      <div className="flex gap-0 overflow-x-auto" style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
        {tabs.map(t=><button key={t.key} onClick={()=>setTab(t.key)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-bold relative" style={tab===t.key?{color:'#c9a84c',borderBottom:'2px solid #c9a84c'}:{color:'#666'}}><t.icon size={13}/>{t.label}{t.badge!==undefined&&t.badge>0&&<span className="absolute top-1 right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>{t.badge}</span>}</button>)}
      </div>

      <div className="p-4 pb-20">
        {tab==='overview'&&(
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#2563eb' }}><Users size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Total Users</p><p className="text-[#60a5fa] font-black text-xl mt-1">{totalUsers}</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#16a34a' }}><Package size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Active Packages</p><p className="text-[#4ade80] font-black text-xl mt-1">{activePackages}</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#d97706' }}><Clock size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Pending Packages</p><p className="text-[#fb923c] font-black text-xl mt-1">{pendingPackages}</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#7c3aed' }}><TrendingUp size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Total Deposits</p><p className="text-[#c084fc] font-black text-sm mt-1">{formatUGX(totalDeposits)} UGX</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#dc2626' }}><ArrowDownToLine size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Total Withdrawals</p><p className="text-[#f87171] font-black text-sm mt-1">{formatUGX(totalWithdrawals)} UGX</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#ea580c' }}><Wallet size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Pending Payouts</p><p className="text-[#fb923c] font-black text-sm mt-1">{formatUGX(pendingPayouts)} UGX</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#0d9488' }}><TrendingUp size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Earnings Distributed</p><p className="text-[#2dd4bf] font-black text-sm mt-1">{formatUGX(earningsDistributed)} UGX</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#db2777' }}><UserCheck size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Referral Earnings</p><p className="text-[#f472b6] font-black text-sm mt-1">{formatUGX(referralEarnings)} UGX</p></div>
            </div>
          </div>
        )}
        {tab==='pesajet'&&<PesaJetTab onRefresh={()=>setRefresh(r=>r+1)} />}
        {tab==='users'&&(
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><Search size={14} className="text-gray-500"/><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search phone..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"/></div>
            {users.filter(u=>u.phone.toLowerCase().includes(searchQ.toLowerCase())).map(user=>{
              const team = users.filter(x=>x.referredBy===user.id);
              const activePkgs = getUserProducts().filter(p=>p.userId===user.id && p.status==='active');
              const totalRecharge = getRechargeOrders().filter(o=>o.userId===user.id && o.status==='completed').reduce((s,o)=>s+Number(o.amount||0),0);
              const totalWithdraw = getWithdrawOrders().filter(o=>o.userId===user.id && o.status==='completed').reduce((s,o)=>s+Number(o.amount||0),0);
              return(
              <div key={user.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.25)' }}>
                <div className="flex justify-between items-center mb-3"><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}><span className="text-black font-black text-xs">{user.phone.slice(-2)}</span></div><div><p className="text-white font-black text-sm">{user.phone}</p><p className="text-gray-500 text-[11px]">{new Date(user.createdAt).toLocaleDateString()} • Code: {user.referralCode}</p></div></div><span className="text-[11px] font-black text-black px-2.5 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Lv {user.level || 1}</span></div>
                <div className="grid grid-cols-2 gap-2 mb-3"><div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #1a1100, #1a1a1a)', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-[#c9a84c] font-black text-base">{formatUGX(user.balance)}</p><p className="text-gray-500 text-[10px]">Balance • Earnings</p></div><div className="rounded-xl p-3" style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}><p className="text-white font-bold text-sm">UGX {Number((user as any).cumulativeIncome||0).toLocaleString()}</p><p className="text-gray-500 text-[10px]">Cumulative Income</p></div></div>
                <div className="grid grid-cols-4 gap-2"><button onClick={()=>{const amt=parseInt(prompt(`Add balance to ${user.phone} (UGX):`)||'0');if(amt>0){updateUser(user.id,{balance:user.balance+amt}as any);toast.success(`Added ${formatUGX(amt)}`);setRefresh(r=>r+1);}}} className="py-2.5 rounded-xl text-[11px] font-black text-black col-span-2" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>+ Add Balance</button><button onClick={()=>{const amt=parseInt(prompt(`Deduct from ${user.phone}:`)||'0');if(amt>0){updateUser(user.id,{balance:Math.max(0,user.balance-amt)}as any);toast.success(`Deducted`);setRefresh(r=>r+1);}}} className="py-2.5 rounded-xl text-[11px] font-bold text-gray-300" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>- Deduct</button><button onClick={()=>{ if(confirm(`Block ${user.phone}?`)){ updateUser(user.id,{isBlocked:!(user as any).isBlocked}as any); toast.success((user as any).isBlocked?'Unblocked':'Blocked'); setRefresh(r=>r+1); } }} className="py-2.5 rounded-xl text-[11px] font-bold" style={(user as any).isBlocked?{background:'rgba(34,197,94,0.15)',color:'#22c55e'}:{background:'rgba(239,68,68,0.1)',color:'#ef4444'}}>{(user as any).isBlocked?'Unblock':'Block'}</button></div>
              </div>
            );})}
          </div>
        )}
        {tab==='recharge'&&<div className="space-y-3">{[...supaRecharge.map((o:any)=>({id:o.id, amount:o.amount, paymentMethod:o.payment_method||'MTN', phoneNumber:o.phone_number||'', status:o.status, userId:o.user_id, createdAt:o.submitted_at, source:'SUPABASE'})), ...rechargeOrdersLocal.map(o=>({...o, source:'LOCAL'}))].map(order=>{const user=getUsers().find(u=>u.id===order.userId);return(<div key={order.id+order.source} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between mb-2"><div><p className="text-white font-bold">{formatUGX(order.amount)} • {order.source}</p><p className="text-gray-400 text-xs">{user?.phone||order.userId?.slice(0,8)} • {order.paymentMethod} • {order.phoneNumber}</p></div><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(order.status)}>{order.status}</span></div>{order.status==='pending'&&<div className="grid grid-cols-2 gap-2"><button onClick={async()=>{ if(order.source==='SUPABASE'){ await supabase.from('investment_packages').update({status:'completed'}).eq('id',order.id); const users=getUsers(); const idx=users.findIndex(x=>x.id===order.userId); if(idx!==-1){ users[idx].balance+=Number(order.amount); saveUsers(users); } } else approveRechargeOrder(order.id); toast.success('Approved'); setRefresh(r=>r+1); }} className="py-2.5 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={async()=>{ if(order.source==='SUPABASE') await supabase.from('investment_packages').update({status:'rejected'}).eq('id',order.id); else rejectRechargeOrder(order.id); toast.success('Rejected'); setRefresh(r=>r+1); }} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}</div>);})}</div>}
        {tab==='withdraw'&&<div className="space-y-3">{withdrawOrders.map(order=>{const user=getUsers().find(u=>u.id===order.userId);return(<div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between mb-2"><div><p className="text-white font-bold">{formatUGX(order.amount)}</p><p className="text-gray-400 text-xs">{user?.phone}</p></div><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(order.status)}>{order.status}</span></div>{order.status==='pending'&&<div className="grid grid-cols-2 gap-2"><button onClick={()=>{approveWithdrawOrder(order.id);toast.success('Approved');setRefresh(r=>r+1);}} className="py-2.5 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={()=>{rejectWithdrawOrder(order.id);toast.success('Rejected');setRefresh(r=>r+1);}} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}</div>);})}</div>}
        {tab==='products'&&<div className="space-y-3">{PRODUCTS.map(product=>{const purchases=getUserProducts().filter(p=>p.productId===product.id);return<div key={product.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between"><div><p className="text-white font-semibold text-sm">VIP{product.vip} {product.name}</p><p className="text-[#c9a84c] font-bold">{formatUGX(product.price)}</p></div><p className="text-white font-black text-xl">{purchases.length}</p></div></div>;})}</div>}
        {tab==='gifts'&&<div className="space-y-3"><div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.3)' }}><p className="text-white font-bold text-sm mb-3">Create Redeem Code (30min expiry)</p><button onClick={()=>{const amt=parseInt(prompt('Amount UGX:')||'0');if(amt>0){const exp=new Date(Date.now()+30*60*1000).toISOString();createGiftCode(amt,undefined,exp);toast.success('Created - 30min expiry');setRefresh(r=>r+1);}}} className="w-full py-3 rounded-xl font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>+ Create Redeem Code</button></div>{getGiftCodes().map(gc=><div key={gc.id} className="rounded-xl p-3 flex justify-between" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div><p className="text-[#c9a84c] font-black text-sm">{gc.code}</p><p className="text-white text-xs">{formatUGX(gc.amount)} {gc.usedBy?'• USED':''}</p></div><button onClick={()=>{deleteGiftCode(gc.id);toast.success('Deleted');setRefresh(r=>r+1);}} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}><Trash2 size={12} className="text-red-400"/></button></div>)}</div>}
        {tab==='resets'&&<div className="space-y-3">{getPasswordResets().map((req:PasswordResetRequest)=><div key={req.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between mb-2"><p className="text-white font-bold text-sm">{req.phone}</p><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(req.status)}>{req.status}</span></div>{req.status==='pending'&&<div className="grid grid-cols-2 gap-2"><button onClick={()=>{approvePasswordReset(req.id);toast.success('Approved');setRefresh(r=>r+1);}} className="py-2 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={()=>{rejectPasswordReset(req.id);toast.success('Rejected');setRefresh(r=>r+1);}} className="py-2 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}</div>)}</div>}
      </div>
    </div>
  );
      }
