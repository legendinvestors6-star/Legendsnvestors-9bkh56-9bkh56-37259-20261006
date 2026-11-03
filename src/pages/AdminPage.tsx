import { useState, useEffect } from 'react';
import { Users, Package, Clock, TrendingUp, ArrowDownToLine, Wallet, Gift, BarChart3, LogOut, Shield, DollarSign, Search, Plus, Minus, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getUsers, getRechargeOrders, getWithdrawOrders, getUserProducts, approveRechargeOrder, rejectRechargeOrder, approveWithdrawOrder, rejectWithdrawOrder, setCurrentUser, formatUGX, updateUser, addTransaction, getGiftCodes, deleteGiftCode } from '@/lib/storage';
import type { User } from '@/types';
import { PRODUCTS } from '@/constants/products';

type Tab = 'overview' | 'users' | 'pesajet' | 'recharge' | 'withdraw' | 'products' | 'gifts';

// PESAJET TAB - FULL MTN/AIRTEL VERIFICATION
function PesaJetTab({ onRefresh }: { onRefresh: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = () => { setLoading(true); setOrders(getRechargeOrders().filter((o:any)=>o.status==='pending')); setLoading(false); };
  useEffect(()=>{ load(); }, []);

  const handleConfirm = (orderId: string, amount: number, phone: string) => {
    if (!confirm(`PESAJET CONFIRM:\n\nHave you received UGX ${amount.toLocaleString()} from +256 ${phone} on MTN 0756406186 (Nabakooza Milly)?\n\nClick OK to approve & credit user!`)) return;
    approveRechargeOrder(orderId);
    toast.success(`✅ PesaJet Confirmed! UGX ${amount} credited!`);
    load(); onRefresh();
  };

  const totalPending = orders.reduce((s:number,o:any)=>s+Number(o.amount||0),0);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(255,204,0,0.4)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ffcc00' }}><span className="text-black font-black text-xs">PesaJet</span></div>
          <div><p className="text-white font-bold text-sm">PesaJet Pay Verification</p><p className="text-gray-400 text-[11px]">MTN MoMo & Airtel Money Auto</p></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.4)' }}><p className="text-yellow-400 font-black text-lg">{orders.length}</p><p className="text-gray-500 text-[10px]">Pending</p></div>
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.4)' }}><p className="text-green-400 font-black text-xs">{formatUGX(totalPending)}</p><p className="text-gray-500 text-[10px]">Total UGX</p></div>
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.4)' }}><p className="text-white font-black text-xs">MTN • Airtel</p><p className="text-gray-500 text-[10px]">0756406186</p></div>
        </div>
      </div>

      <button onClick={load} className="w-full py-3 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-2" style={{ background: '#ffcc00' }}>{loading?'⏳ Checking...':'🔄 Refresh PesaJet Status'}</button>

      {orders.length===0?(
        <div className="rounded-2xl p-10 text-center" style={{ background: '#111827', border: '1px dashed #333' }}>
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(255,204,0,0.1)' }}><DollarSign size={20} className="text-yellow-400"/></div>
          <p className="text-white text-sm font-semibold">No pending PesaJet payments</p>
          <p className="text-gray-500 text-xs mt-1">When user pays via MTN/Airtel, it appears here automatically</p>
        </div>
      ):orders.map((o:any)=>(
        <div key={o.id} className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,204,0,0.35)' }}>
          <div className="flex justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2"><p className="text-white font-black text-base">{formatUGX(o.amount)}</p><span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${o.paymentMethod==='MTN'?'bg-yellow-500/20 text-yellow-400':'bg-red-500/20 text-red-400'}`}>{o.paymentMethod==='MTN'?'MTN MoMo':'Airtel Money'}</span></div>
              <p className="text-gray-300 text-xs font-medium mt-1">Sender: +256 {o.phoneNumber}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">Order: {o.id.slice(0,12)}... • {new Date(o.createdAt).toLocaleTimeString()}</p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full font-bold h-fit" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>PENDING PESAJET</span>
          </div>
          <div className="rounded-xl p-3 mb-3 space-y-2" style={{ background: '#1f2937', border: '1px solid #374151' }}>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Amount to verify</span><span className="text-yellow-400 font-black">{formatUGX(o.amount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Sender number</span><span className="text-white font-semibold">+256 {o.phoneNumber}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Your MTN account</span><span className="text-white font-semibold">0756406186 (Nabakooza Milly)</span></div>
            <div className="rounded-lg p-2 mt-2" style={{ background: 'rgba(255,204,0,0.08)' }}><p className="text-yellow-400 text-[10px] font-semibold">📱 How to verify: Dial *185*1# → Check balance → Look for UGX {o.amount} from {o.phoneNumber}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>handleConfirm(o.id,o.amount,o.phoneNumber)} className="py-3 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1" style={{ background: '#ffcc00' }}>💰 Manual Confirm</button>
            <button onClick={()=>{ if(confirm('Reject? Money NOT credited.')){ rejectRechargeOrder(o.id); toast.success('Rejected'); load(); onRefresh(); } }} className="py-3 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// USER CARD WITH ALL DETAILS
function UserCard({ user, allUsers, onRefresh }: { user: User; allUsers: User[]; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const prods = getUserProducts(user.id);
  const active = prods.filter((p:any) => p.status === 'active');
  const activeBal = active.reduce((s:number,p:any)=>s+Number(p.price||0),0);
  const totalEarn = prods.reduce((s:number,p:any)=>s+Number(p.totalEarned||0),0)+Number((user as any).cumulativeIncome||0);
  const totalDep = getRechargeOrders(user.id).filter((o:any)=>o.status==='completed').reduce((s:number,o:any)=>s+Number(o.amount||0),0);
  const totalWith = getWithdrawOrders(user.id).filter((o:any)=>o.status==='completed').reduce((s:number,o:any)=>s+Number(o.amount||0),0);
  const pendingWith = getWithdrawOrders(user.id).filter((o:any)=>o.status==='pending').reduce((s:number,o:any)=>s+Number(o.amount||0),0);
  const team = allUsers.filter((u:any)=>u.referredBy===user.id || (u as any).referred_by===user.id || u.referredBy===user.referralCode);

  return (
    <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}>
      <div className="flex justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2"><p className="text-white font-bold text-sm">{user.phone}</p><span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-600 text-white">Lv{user.level}</span><span className="text-[9px] px-2 py-0.5 rounded-full bg-green-600 text-white">{active.length} Active</span></div>
          <p className="text-gray-500 text-[11px] mt-1">Code: {user.referralCode} | Team: {team.length}</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-lg p-2" style={{ background: '#1f2937' }}><p className="text-gray-500 text-[10px]">Balance</p><p className="text-yellow-400 font-bold text-xs">{formatUGX(user.balance)}</p></div>
            <div className="rounded-lg p-2" style={{ background: '#1f2937' }}><p className="text-gray-500 text-[10px]">Total Earnings</p><p className="text-green-400 font-bold text-xs">{formatUGX(totalEarn)}</p></div>
            <div className="rounded-lg p-2" style={{ background: '#1f2937' }}><p className="text-gray-500 text-[10px]">Active Packages Balance</p><p className="text-cyan-400 font-bold text-xs">{formatUGX(activeBal)}</p></div>
            <div className="rounded-lg p-2" style={{ background: '#1f2937' }}><p className="text-gray-500 text-[10px]">Total Withdrawal</p><p className="text-red-400 font-bold text-xs">{formatUGX(totalWith)}</p>{pendingWith>0&&<p className="text-orange-400 text-[9px]">Pend {formatUGX(pendingWith)}</p>}</div>
            <div className="rounded-lg p-2" style={{ background: '#1f2937' }}><p className="text-gray-500 text-[10px]">Total Deposit</p><p className="text-purple-400 font-bold text-xs">{formatUGX(totalDep)}</p></div>
            <div className="rounded-lg p-2" style={{ background: '#1f2937' }}><p className="text-gray-500 text-[10px]">Team Referrals</p><p className="text-blue-400 font-bold text-xs">{team.length} users</p></div>
          </div>
        </div>
        <button onClick={()=>setOpen(!open)} className="w-8 h-8 rounded-lg flex items-center justify-center ml-2" style={{ background: '#1f2937' }}><Eye size={14} className="text-gray-400"/></button>
      </div>
      {open && <div className="mt-3 pt-3" style={{ borderTop: '1px solid #1f2937' }}><p className="text-white text-xs font-bold mb-2">Team ({user.referralCode}):</p>{team.length===0?<p className="text-gray-600 text-xs">No team</p>:team.map((m:any)=><div key={m.id} className="flex justify-between py-1 text-xs"><span className="text-gray-400">{m.phone}</span><span className="text-white">{formatUGX(m.balance)}</span></div>)}<p className="text-white text-xs font-bold mt-3">Active Packages:</p>{active.map((p:any)=>{ const pr=PRODUCTS.find(x=>x.id===p.productId); return <div key={p.id} className="flex justify-between text-xs py-1"><span className="text-gray-400">VIP{pr?.vip} - {formatUGX(p.price)}</span><span className="text-green-400">Earned {formatUGX(p.totalEarned||0)}</span></div>; })}</div>}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <button onClick={()=>{ const a=parseInt(prompt(`Add to ${user.phone}:`)||'0'); if(a>0){ updateUser(user.id,{balance:Number(user.balance)+a} as any); addTransaction({userId:user.id,type:'income',amount:a,status:'completed',description:'Admin add'} as any); toast.success(`Added ${formatUGX(a)}`); onRefresh(); } }} className="py-2.5 rounded-xl text-xs font-bold text-black flex flex-col items-center" style={{ background: '#ffcc00' }}><Plus size={14}/>Add</button>
        <button onClick={()=>{ const a=parseInt(prompt(`Deduct from ${user.phone} Bal ${formatUGX(user.balance)}:`)||'0'); if(a>0&&a<=Number(user.balance)){ updateUser(user.id,{balance:Number(user.balance)-a} as any); toast.success(`Deducted ${formatUGX(a)}`); onRefresh(); } }} className="py-2.5 rounded-xl text-xs font-bold text-white flex flex-col items-center" style={{ background: '#1f2937' }}><Minus size={14}/>Deduct</button>
        <button onClick={()=>{ if(confirm(`Reject ${user.phone}? Set bal 0?`)){ updateUser(user.id,{balance:0} as any); toast.success('Blocked'); onRefresh(); } }} className="py-2.5 rounded-xl text-xs font-bold text-orange-400 flex flex-col items-center" style={{ background: 'rgba(251,146,60,0.1)' }}><Clock size={14}/>Reject</button>
        <button onClick={()=>{ if(confirm(`DELETE ${user.phone}?`)){ const all=getUsers().filter((u:any)=>u.id!==user.id); localStorage.setItem('legend_users',JSON.stringify(all)); toast.success('Deleted'); onRefresh(); } }} className="py-2.5 rounded-xl text-xs font-bold text-red-400 flex flex-col items-center" style={{ background: 'rgba(239,68,68,0.1)' }}><Trash2 size={14}/>Delete</button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0);
  const users = getUsers().filter((u:any) => !u.isAdmin);
  const userProducts = getUserProducts();
  const rechargeOrders = getRechargeOrders();
  const withdrawOrders = getWithdrawOrders();

  const totalUsers = users.length;
  const activePackages = userProducts.filter((p:any) => p.status === 'active').length;
  const pendingPackages = rechargeOrders.filter((o:any) => o.status === 'pending').length;
  const totalDeposit = rechargeOrders.filter((o:any) => o.status === 'completed').reduce((s:number,o:any) => s + Number(o.amount||0), 0);
  const totalWithdrawal = withdrawOrders.filter((o:any) => o.status === 'completed').reduce((s:number,o:any) => s + Number(o.amount||0), 0);
  const pendingPayouts = withdrawOrders.filter((o:any) => o.status === 'pending').reduce((s:number,o:any) => s + Number(o.amount||0), 0);
  const earningDistributed = userProducts.reduce((s:number,p:any) => s + Number(p.totalEarned||0), 0) + users.reduce((s:number,u:any) => s + Number((u as any).cumulativeIncome||0), 0);
  const totalReferral = Math.floor(totalDeposit * 0.30);
  const filtered = users.filter((u:any) => u.phone.includes(search) || u.referralCode.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1c' }}>
      <div className="flex items-center justify-between p-4" style={{ background: '#111827', borderBottom: '1px solid #1f2937' }}>
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Shield size={16} className="text-white"/></div><p className="text-white font-bold">Admin - PesaJet Active</p><span className="text-[9px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold ml-2">PESAJET</span></div>
        <button onClick={() => { setCurrentUser(null); navigate('/login'); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1f2937' }}><LogOut size={14} className="text-gray-400"/></button>
      </div>
      <div className="flex gap-1 overflow-x-auto p-2" style={{ background: '#111827' }}>
        {[
          { k: 'overview', l: 'Dashboard' },
          { k: 'pesajet', l: `PesaJet ${pendingPackages}` },
          { k: 'users', l: `Users ${totalUsers}` },
          { k: 'recharge', l: 'Deposits' },
          { k: 'withdraw', l: 'Withdraw' },
          { k: 'gifts', l: 'Gifts' },
        ].map(t => <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${tab===t.k?'bg-white text-black':'bg-[#1f2937] text-gray-400'}`}>{t.l}</button>)}
      </div>
      <div className="p-4 pb-24">
        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-2"><Users size={18} className="text-white"/></div><p className="text-gray-400 text-xs">Total Users</p><p className="text-white font-bold">{totalUsers}</p></div>
            <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center mb-2"><Package size={18} className="text-white"/></div><p className="text-gray-400 text-xs">Active Packages 📦</p><p className="text-white font-bold">{activePackages}</p></div>
            <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl bg-yellow-600 flex items-center justify-center mb-2"><Clock size={18} className="text-white"/></div><p className="text-gray-400 text-xs">Pending Packages</p><p className="text-white font-bold">{pendingPackages}</p></div>
            <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center mb-2"><TrendingUp size={18} className="text-white"/></div><p className="text-gray-400 text-xs">Total Deposits</p><p className="text-white font-bold text-sm">{totalDeposit.toLocaleString()} UGX</p></div>
            <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center mb-2"><ArrowDownToLine size={18} className="text-white"/></div><p className="text-gray-400 text-xs">Total Withdrawals</p><p className="text-white font-bold text-sm">{totalWithdrawal.toLocaleString()} UGX</p></div>
            <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center mb-2"><Wallet size={18} className="text-white"/></div><p className="text-gray-400 text-xs">Pending Payouts</p><p className="text-white font-bold text-sm">{pendingPayouts.toLocaleString()} UGX</p></div>
            <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center mb-2"><BarChart3 size={18} className="text-white"/></div><p className="text-gray-400 text-xs">Earnings Distributed</p><p className="text-white font-bold text-sm">{earningDistributed.toLocaleString()} UGX</p></div>
            <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center mb-2"><Gift size={18} className="text-white"/></div><p className="text-gray-400 text-xs">Total Referral</p><p className="text-white font-bold text-sm">{totalReferral.toLocaleString()} UGX</p></div>
          </div>
        )}
        {tab === 'pesajet' && <PesaJetTab onRefresh={()=>setRefresh(r=>r+1)} />}
        {tab === 'users' && <div className="space-y-3"><div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#111827', border: '1px solid #1f2937' }}><Search size={14} className="text-gray-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search phone or referral code..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"/></div>{filtered.map((u:any)=><UserCard key={u.id} user={u} allUsers={users} onRefresh={()=>setRefresh(r=>r+1)}/>)}{filtered.length===0&&<p className="text-gray-500 text-center py-8">No users</p>}</div>}
        {tab === 'recharge' && <div className="space-y-2">{rechargeOrders.map((o:any)=><div key={o.id} className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="flex justify-between"><p className="text-white font-bold">{formatUGX(o.amount)}</p><span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">{o.status}</span></div><p className="text-gray-400 text-xs">+256 {o.phoneNumber}</p></div>)}</div>}
        {tab === 'withdraw' && <div className="space-y-2">{withdrawOrders.map((o:any)=><div key={o.id} className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}><div className="flex justify-between"><p className="text-white font-bold">{formatUGX(o.amount)}</p><span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">{o.status}</span></div><p className="text-gray-400 text-xs">{o.userId.slice(0,8)}</p></div>)}</div>}
        {tab === 'gifts' && <div className="space-y-2">{getGiftCodes().map((gc:any)=><div key={gc.id} className="rounded-xl p-3 flex justify-between" style={{ background: '#111827', border: '1px solid #1f2937' }}><div><p className="text-yellow-400 font-bold text-sm">{gc.code}</p><p className="text-white text-xs">{formatUGX(gc.amount)}</p></div><button onClick={()=>{deleteGiftCode(gc.id);setRefresh(r=>r+1);}} className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}><Trash2 size={12} className="text-red-400"/></button></div>)}</div>}
      </div>
    </div>
  );
              }
