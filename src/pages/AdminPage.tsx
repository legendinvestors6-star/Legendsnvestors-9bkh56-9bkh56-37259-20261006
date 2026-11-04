import { useState, useEffect } from 'react';
import { Users, CreditCard, ArrowDownToLine, BarChart3, Search, LogOut, Shield, Gift, DollarSign, Trash2, Package, Clock, TrendingUp, Wallet, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getUsers, getRechargeOrders, getWithdrawOrders, getUserProducts, approveRechargeOrder, rejectRechargeOrder, approveWithdrawOrder, rejectWithdrawOrder, setCurrentUser, formatUGX, updateUser, saveUsers, getGiftCodes, createGiftCode, deleteGiftCode, getPasswordResets, approvePasswordReset, rejectPasswordReset, getTransactions } from '@/lib/storage';
import type { PasswordResetRequest } from '@/lib/storage';
import { PRODUCTS } from '@/constants/products';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
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
      const { data, error } = await supabase.from('investment_packages').select('*').eq('status','pending').order('submitted_at',{ascending:false}).limit(100);
      if(error) errorMsg = error.message;
      else if(data) combined = data.map((d:any) => ({ id: d.id, userId: d.user_id, amount: Number(d.amount), paymentMethod: d.payment_method || 'MTN', phoneNumber: d.phone_number || '', status: d.status, createdAt: d.submitted_at || d.created_at, source: 'SUPABASE' }));
    } catch(e:any){ errorMsg = e.message; }
    try {
      const local = getRechargeOrders().filter(o=>o.status==='pending').map((o:any)=>({ ...o, source:'LOCAL' }));
      combined = [...combined, ...local];
      setDebug({ local: local.length, supa: combined.filter((o:any)=>o.source==='SUPABASE').length, error: errorMsg, hasEnv: !!supabaseUrl });
    } catch {}
    const uniq = Array.from(new Map(combined.map((o:any)=>[o.id, o])).values());
    setOrders(uniq);
    setLoading(false);
  };

  const creditUserWallet = async (userId: string, phoneNumber: string, amount: number) => {
    const amt = Number(amount);
    let credited = false;
    const tablesToTry = ['platform_users', 'users', 'profiles'];
    for(const tbl of tablesToTry){
      try{
        const { data } = await supabase.from(tbl).select('*').eq('id', userId).single();
        if(data){
          const balKey = data.wallet_balance !== undefined ? 'wallet_balance' : 'balance';
          const newBal = Number(data[balKey]||0) + amt;
          await supabase.from(tbl).update({ [balKey]: newBal }).eq('id', userId);
          credited = true; break;
        }
      }catch{}
    }
    if(!credited && phoneNumber){
      for(const tbl of tablesToTry){
        try{
          const { data } = await supabase.from(tbl).select('*').ilike('phone', `%${phoneNumber.slice(-9)}%`).single();
          if(data){
            const balKey = data.wallet_balance !== undefined ? 'wallet_balance' : 'balance';
            const newBal = Number(data[balKey]||0) + amt;
            await supabase.from(tbl).update({ [balKey]: newBal }).eq('id', data.id);
            credited = true; break;
          }
        }catch{}
      }
    }
    try{
      const users = getUsers();
      const idx = users.findIndex(x=> x.id===userId || (phoneNumber && x.phone.includes(phoneNumber.slice(-9))));
      if(idx!==-1){
        users[idx].balance = Number(users[idx].balance||0) + amt;
        (users[idx] as any).cumulativeIncome = Number((users[idx] as any).cumulativeIncome||0) + amt;
        saveUsers(users);
        credited = true;
      }
    }catch{}
    return credited;
  };

  const handleApprove = async (order:any) => {
    if(!confirm(`Confirm ${formatUGX(order.amount)} from ${order.phoneNumber}?`)) return;
    setLoading(true);
    try{
      await supabase.from('investment_packages').update({status:'completed'}).eq('id',order.id);
      if(order.source==='LOCAL') approveRechargeOrder(order.id);
      await creditUserWallet(order.userId, order.phoneNumber, order.amount);
      toast.success(`✅ ${formatUGX(order.amount)} Credited to ${order.phoneNumber}!`);
      load(); onRefresh();
    }catch(e:any){ toast.error('Failed: '+e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); const i=setInterval(load, 5000); return ()=>clearInterval(i); }, []);
  
  return (
    <div className="space-y-3">
      <div className="rounded-xl p-2 text-[10px]" style={{ background: debug.error ? 'rgba(239,68,68,0.15)' : '#111', border: '1px solid #222' }}>
        <p className="text-gray-400">ENV: {debug.hasEnv ? '✅' : '❌ MISSING!'} | Local:{debug.local||0} Supa:{debug.supa||0}</p>
      </div>
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.4)' }}>
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}><span className="text-black font-black text-xs">PesaJet</span></div><div><p className="text-white font-black text-sm">PesaJet - MTN 0756406186</p><p className="text-[#c9a84c] text-[11px]">{orders.length} pending • Local:{debug.local||0} Supa:{debug.supa||0}</p></div></div>
      </div>
      <button onClick={load} className="w-full py-3 rounded-xl font-black text-black text-sm" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>{loading?'⏳ Checking...':`🔄 Refresh (${orders.length})`}</button>
      {orders.map((order:any)=>(
        <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.35)' }}>
          <div className="flex justify-between mb-2"><div><p className="text-white font-black">{formatUGX(order.amount)} - {order.paymentMethod}</p><p className="text-gray-400 text-xs">{order.phoneNumber} • {order.userId?.slice(0,8)}</p></div><span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>PENDING</span></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>handleApprove(order)} className="py-3 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>💰 Confirm + Credit</button>
            <button onClick={async()=>{ if(!confirm('Reject?')) return; await supabase.from('investment_packages').update({status:'rejected'}).eq('id',order.id); toast.success('Rejected'); load(); onRefresh(); }} className="py-3 rounded-xl text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button>
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
  const [supaUsers, setSupaUsers] = useState<any[]>([]);
  const [supaRecharge, setSupaRecharge] = useState<any[]>([]);
  const [supaAll, setSupaAll] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ===== ADMIN SEES EVERYONE FROM DIFFERENT DEVICES - FROM SUPABASE =====
  const loadAllUsersFromSupabase = async () => {
    setLoadingUsers(true);
    let all: any[] = [];
    try{
      // Try platform_users first
      const { data: pUsers, error: pErr } = await supabase.from('platform_users').select('*').order('created_at',{ascending:false}).limit(500);
      if(!pErr && pUsers && pUsers.length>0){
        all = pUsers.map((u:any)=>({
          id: u.id,
          phone: u.phone || u.phone_number || '',
          balance: Number(u.wallet_balance || u.balance || 0),
          cumulativeIncome: Number(u.cumulative_income || u.cumulativeIncome || u.total_earnings || 0),
          level: u.level || 1,
          referralCode: u.referral_code || u.referralCode || u.id.slice(0,6).toUpperCase(),
          createdAt: u.created_at || new Date().toISOString(),
          isAdmin: false,
          source: 'SUPABASE'
        }));
      } else {
        // Try users table
        const { data: usersTbl } = await supabase.from('users').select('*').order('created_at',{ascending:false}).limit(500);
        if(usersTbl) all = usersTbl.map((u:any)=>({ id: u.id, phone: u.phone||'', balance: Number(u.balance||0), cumulativeIncome: Number(u.cumulative_income||u.balance||0), level: 1, referralCode: u.referral_code||u.id.slice(0,6).toUpperCase(), createdAt: u.created_at, isAdmin: false, source: 'SUPABASE' }));
      }
    }catch(e){ console.error('load users failed', e); }

    // Merge with local users
    try{
      const localUsers = getUsers().filter(u => !u.isAdmin).map(u=>({ ...u, source: 'LOCAL' }));
      const merged = [...all];
      for(const lu of localUsers){
        if(!merged.find(m=> m.phone===lu.phone || m.id===lu.id)) merged.push(lu as any);
      }
      setSupaUsers(merged);
    }catch{
      setSupaUsers(all);
    }
    setLoadingUsers(false);
  };

  useEffect(()=>{ 
    loadAllUsersFromSupabase();
    (async()=>{ try{ const {data}=await supabase.from('investment_packages').select('*'); setSupaAll(data||[]); setSupaRecharge((data||[]).filter((d:any)=>d.status==='pending')); }catch{} })(); 
  },[refresh]);

  const users = supaUsers.length>0 ? supaUsers : getUsers().filter(u => !u.isAdmin);
  const rechargeOrdersLocal = getRechargeOrders();
  const withdrawOrders = getWithdrawOrders();
  const userProducts = getUserProducts();
  const transactions = getTransactions();
  
  const pendingRechargeCount = supaRecharge.length + rechargeOrdersLocal.filter(o=>o.status==='pending').length;
  const pendingWithdraw = withdrawOrders.filter(o => o.status === 'pending');
  const passwordResets = getPasswordResets();
  
  const totalUsers = users.length;
  const activePackages = userProducts.filter(p=>p.status==='active').length;
  const pendingPackages = pendingRechargeCount;
  const totalDeposits = supaAll.filter((d:any)=>d.status==='completed').reduce((s:any,o:any)=>s+Number(o.amount||0),0);
  const totalWithdrawals = withdrawOrders.filter(o=>o.status==='completed').reduce((s,o)=>s+Number(o.amount||0),0);
  const pendingPayouts = withdrawOrders.filter(o=>o.status==='pending').reduce((s,o)=>s+Number(o.amount||0),0);
  const earningsDistributed = users.reduce((s:any,u:any)=>s+Number(u.cumulativeIncome||u.cumulative_income||0),0);
  const referralEarnings = earningsDistributed;

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

  const handleAddBalance = async (user:any, isDeduct=false) => {
    const amtStr = prompt(`${isDeduct?'Deduct from':'Add balance to'} ${user.phone} (UGX):`);
    const amt = parseInt(amtStr||'0');
    if(!amt || amt<=0) return;
    const finalAmt = isDeduct ? -amt : amt;
    try{
      for(const tbl of ['platform_users','users']){
        try{
          const { data } = await supabase.from(tbl).select('*').eq('id', user.id).single();
          if(data){
            const balKey = data.wallet_balance !== undefined ? 'wallet_balance' : 'balance';
            const newBal = Math.max(0, Number(data[balKey]||0)+finalAmt);
            await supabase.from(tbl).update({ [balKey]: newBal }).eq('id', user.id);
            break;
          }
        }catch{
          // try by phone
          try{
            const { data } = await supabase.from('platform_users').select('*').ilike('phone', `%${user.phone.slice(-9)}%`).single();
            if(data){
              await supabase.from('platform_users').update({ wallet_balance: Math.max(0, Number(data.wallet_balance||0)+finalAmt) }).eq('id', data.id);
              break;
            }
          }catch{}
        }
      }
    }catch(e){ console.error(e); }
    try{ updateUser(user.id,{balance: Math.max(0, Number(user.balance||0)+finalAmt)} as any); }catch{}
    toast.success(`${isDeduct?'Deducted':'Added'} ${formatUGX(amt)} - User from any device!`);
    setRefresh(r=>r+1); loadAllUsersFromSupabase();
  };

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <div className="flex items-center justify-between p-4" style={{ background: 'linear-gradient(135deg, #000000, #1a1100)', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}><Shield size={18} className="text-black"/></div><span className="text-white font-black">Admin Panel</span><span className="text-[9px] font-black text-black px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>{users.length} USERS • CROSS-DEVICE</span></div>
        <button onClick={()=>{setCurrentUser(null);navigate('/login');}} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><LogOut size={15} className="text-gray-400"/></button>
      </div>
      <div className="flex gap-0 overflow-x-auto" style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
        {tabs.map(t=><button key={t.key} onClick={()=>setTab(t.key)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-bold relative" style={tab===t.key?{color:'#c9a84c',borderBottom:'2px solid #c9a84c'}:{color:'#666'}}><t.icon size={13}/>{t.label}{t.badge!==undefined&&t.badge>0&&<span className="absolute top-1 right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>{t.badge}</span>}</button>)}
      </div>
      <div className="p-4 pb-20">
        {tab==='overview'&&(
          <div className="space-y-3">
            <button onClick={()=>{loadAllUsersFromSupabase(); setRefresh(r=>r+1);}} className="w-full py-2 rounded-xl text-xs text-[#c9a84c]" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>🔄 Refresh All Users From Supabase ({users.length}) - Cross Device</button>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#2563eb' }}><Users size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Total Users</p><p className="text-[#60a5fa] font-black text-xl mt-1">{totalUsers}</p><p className="text-gray-500 text-[10px]">From all devices</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#16a34a' }}><Package size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Active Packages</p><p className="text-[#4ade80] font-black text-xl mt-1">{activePackages}</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#d97706' }}><Clock size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Pending Packages</p><p className="text-[#fb923c] font-black text-xl mt-1">{pendingPackages}</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#7c3aed' }}><TrendingUp size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Total Deposits</p><p className="text-[#c084fc] font-black text-sm mt-1">{formatUGX(totalDeposits)}</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#dc2626' }}><ArrowDownToLine size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Total Withdrawals</p><p className="text-[#f87171] font-black text-sm mt-1">{formatUGX(totalWithdrawals)}</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#ea580c' }}><Wallet size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Pending Payouts</p><p className="text-[#fb923c] font-black text-sm mt-1">{formatUGX(pendingPayouts)}</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#0d9488' }}><TrendingUp size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Earnings Distributed</p><p className="text-[#2dd4bf] font-black text-sm mt-1">{formatUGX(earningsDistributed)}</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#db2777' }}><UserCheck size={20} className="text-white"/></div><p className="text-gray-400 text-[12px]">Referral Earnings</p><p className="text-[#f472b6] font-black text-sm mt-1">{formatUGX(referralEarnings)}</p></div>
            </div>
          </div>
        )}
        {tab==='pesajet'&&<PesaJetTab onRefresh={()=>{setRefresh(r=>r+1); loadAllUsersFromSupabase();}} />}
        {tab==='users'&&(
          <div className="space-y-3">
            <button onClick={()=>{loadAllUsersFromSupabase(); setRefresh(r=>r+1);}} className="w-full py-2.5 rounded-xl font-black text-black text-xs" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>{loadingUsers?'⏳ Loading...':`🔄 Refresh Users From All Devices (${users.length}) - Supabase + Local`}</button>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><Search size={14} className="text-gray-500"/><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search phone..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"/></div>
            {users.filter(u=> (u.phone||'').toLowerCase().includes(searchQ.toLowerCase())).map(user=>(
              <div key={user.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.25)' }}>
                <div className="flex justify-between items-center mb-3"><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}><span className="text-black font-black text-xs">{(user.phone||'--').slice(-2)}</span></div><div><p className="text-white font-black text-sm">{user.phone} {(user as any).source==='SUPABASE'&&<span className="text-[9px] text-green-400">• SUPABASE</span>}{(user as any).source==='LOCAL'&&<span className="text-[9px] text-yellow-400">• LOCAL</span>}</p><p className="text-gray-500 text-[11px]">{user.createdAt?new Date(user.createdAt).toLocaleDateString():'--'} • Code: {user.referralCode||'--'}</p></div></div><span className="text-[11px] font-black text-black px-2.5 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Lv {user.level || 1}</span></div>
                <div className="grid grid-cols-2 gap-2 mb-3"><div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #1a1100, #1a1a1a)', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-[#c9a84c] font-black text-base">{formatUGX(user.balance)}</p><p className="text-gray-500 text-[10px]">Balance • From {(user as any).source||'UNKNOWN'}</p></div><div className="rounded-xl p-3" style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}><p className="text-white font-bold text-sm">UGX {Number((user as any).cumulativeIncome||(user as any).cumulative_income||0).toLocaleString()}</p><p className="text-gray-500 text-[10px]">Cumulative Income</p></div></div>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={()=>handleAddBalance(user,false)} className="py-2.5 rounded-xl text-[11px] font-black text-black col-span-2" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>+ Add Balance</button>
                  <button onClick={()=>handleAddBalance(user,true)} className="py-2.5 rounded-xl text-[11px] font-bold text-gray-300" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>- Deduct</button>
                  <button onClick={()=>{ if(confirm(`Block ${user.phone}?`)){ updateUser(user.id,{isBlocked:!(user as any).isBlocked}as any); toast.success((user as any).isBlocked?'Unblocked':'Blocked'); setRefresh(r=>r+1); } }} className="py-2.5 rounded-xl text-[11px] font-bold" style={(user as any).isBlocked?{background:'rgba(34,197,94,0.15)',color:'#22c55e'}:{background:'rgba(239,68,68,0.1)',color:'#ef4444'}}>{(user as any).isBlocked?'Unblock':'Block'}</button>
                </div>
              </div>
            ))}
            {users.length===0&&<div className="rounded-2xl p-10 text-center" style={{ background: '#111', border: '1px dashed #333' }}><p className="text-gray-400 text-sm">No users found</p><p className="text-gray-600 text-xs mt-2">If you have users on other phones, they are stored in localStorage only. You need to make registration save to Supabase!</p></div>}
          </div>
        )}
        {tab==='recharge'&&<div className="space-y-3">{[...supaRecharge.map((o:any)=>({id:o.id, amount:o.amount, paymentMethod:o.payment_method||'MTN', phoneNumber:o.phone_number||'', status:o.status, userId:o.user_id, createdAt:o.submitted_at, source:'SUPABASE'})), ...rechargeOrdersLocal.map(o=>({...o, source:'LOCAL'}))].map(order=>{const user=users.find(u=>u.id===order.userId || u.phone.includes(order.phoneNumber?.slice(-9)||''));return(<div key={order.id+order.source} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between mb-2"><div><p className="text-white font-bold">{formatUGX(order.amount)} • {order.source}</p><p className="text-gray-400 text-xs">{user?.phone||order.userId?.slice(0,8)} • {order.paymentMethod} • {order.phoneNumber}</p></div><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(order.status)}>{order.status}</span></div>{order.status==='pending'&&<div className="grid grid-cols-2 gap-2"><button onClick={async()=>{ await supabase.from('investment_packages').update({status:'completed'}).eq('id',order.id); toast.success('Approved + Credited'); setRefresh(r=>r+1); loadAllUsersFromSupabase(); }} className="py-2.5 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={async()=>{ await supabase.from('investment_packages').update({status:'rejected'}).eq('id',order.id); toast.success('Rejected'); setRefresh(r=>r+1); }} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}</div>);})}</div>}
        {tab==='withdraw'&&<div className="space-y-3">{withdrawOrders.map(order=>{const user=users.find(u=>u.id===order.userId);return(<div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between mb-2"><div><p className="text-white font-bold">{formatUGX(order.amount)}</p><p className="text-gray-400 text-xs">{user?.phone||order.userId}</p></div><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(order.status)}>{order.status}</span></div>{order.status==='pending'&&<div className="grid grid-cols-2 gap-2"><button onClick={()=>{approveWithdrawOrder(order.id);toast.success('Approved');setRefresh(r=>r+1);}} className="py-2.5 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={()=>{rejectWithdrawOrder(order.id);toast.success('Rejected');setRefresh(r=>r+1);}} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}</div>);})}</div>}
        {tab==='products'&&<div className="space-y-3">{PRODUCTS.map(product=>{const purchases=getUserProducts().filter(p=>p.productId===product.id);return<div key={product.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between"><div><p className="text-white font-semibold text-sm">VIP{product.vip} {product.name}</p><p className="text-[#c9a84c] font-bold">{formatUGX(product.price)}</p></div><p className="text-white font-black text-xl">{purchases.length}</p></div></div>;})}</div>}
        {tab==='gifts'&&<div className="space-y-3"><div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.3)' }}><p className="text-white font-bold text-sm mb-3">Create Redeem Code</p><button onClick={()=>{const amt=parseInt(prompt('Amount UGX:')||'0');if(amt>0){const exp=new Date(Date.now()+30*60*1000).toISOString();createGiftCode(amt,undefined,exp);toast.success('Created');setRefresh(r=>r+1);}}} className="w-full py-3 rounded-xl font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>+ Create Redeem Code</button></div>{getGiftCodes().map(gc=><div key={gc.id} className="rounded-xl p-3 flex justify-between" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div><p className="text-[#c9a84c] font-black text-sm">{gc.code}</p><p className="text-white text-xs">{formatUGX(gc.amount)}</p></div><button onClick={()=>{deleteGiftCode(gc.id);toast.success('Deleted');setRefresh(r=>r+1);}} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}><Trash2 size={12} className="text-red-400"/></button></div>)}</div>}
        {tab==='resets'&&<div className="space-y-3">{getPasswordResets().map((req:PasswordResetRequest)=><div key={req.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between mb-2"><p className="text-white font-bold text-sm">{req.phone}</p><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(req.status)}>{req.status}</span></div>{req.status==='pending'&&<div className="grid grid-cols-2 gap-2"><button onClick={()=>{approvePasswordReset(req.id);toast.success('Approved');setRefresh(r=>r+1);}} className="py-2 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={()=>{rejectPasswordReset(req.id);toast.success('Rejected');setRefresh(r=>r+1);}} className="py-2 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}</div>)}</div>}
      </div>
    </div>
  );
        }
