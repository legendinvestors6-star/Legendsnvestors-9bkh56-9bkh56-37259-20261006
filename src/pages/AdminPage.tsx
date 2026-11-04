import { useState, useEffect } from 'react';
import { Users, CreditCard, ArrowDownToLine, BarChart3, Search, LogOut, Shield, TrendingUp, Gift, DollarSign, Trash2, Copy, Package, Clock, Wallet, Banknote, Megaphone, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getUsers, getRechargeOrders, getWithdrawOrders, getUserProducts, approveRechargeOrder, rejectRechargeOrder, approveWithdrawOrder, rejectWithdrawOrder, setCurrentUser, formatUGX, updateUser, getGiftCodes, createGiftCode, deleteGiftCode, getPasswordResets, approvePasswordReset, rejectPasswordReset } from '@/lib/storage';
import type { PasswordResetRequest, GiftCode } from '@/lib/storage';
import type { User, RechargeOrder, WithdrawOrder } from '@/types';
import { PRODUCTS } from '@/constants/products';

type AdminTab = 'overview' | 'users' | 'recharge' | 'withdraw' | 'products' | 'gifts' | 'resets' | 'pesajet';

// PESAJET - USES RECHARGE TABLE - BLACK & GOLD
function PesaJetTab({ onRefresh }: { onRefresh: () => void }) {
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const load = () => { setLoading(true); setOrders(getRechargeOrders().filter(o => o.status === 'pending')); setLoading(false); };
  useEffect(() => { load(); }, []);
  const total = orders.reduce((s:number,o:any) => s+Number(o.amount||0),0);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.4)' }}>
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}><span className="text-black font-black text-xs">PesaJet</span></div><div><p className="text-white font-black text-sm">PesaJet Pay - Uses Recharge Table</p><p className="text-[#c9a84c] text-[11px]">MTN 0756406186 (Nabakooza Milly) • RECHARGE pending</p></div></div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.5)' }}><p className="text-[#c9a84c] font-black">{orders.length}</p><p className="text-gray-500 text-[10px]">Pending</p></div>
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.5)' }}><p className="text-white font-black text-xs">{formatUGX(total)}</p><p className="text-gray-500 text-[10px]">Total UGX</p></div>
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.5)' }}><p className="text-green-400 font-black text-xs">MTN • Airtel</p><p className="text-gray-500 text-[10px]">Uganda</p></div>
        </div>
      </div>
      <button onClick={load} className="w-full py-3 rounded-xl font-black text-black text-sm" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>{loading?'⏳ Checking...':`🔄 Refresh PesaJet (${orders.length}) - From Recharge`}</button>
      {orders.length===0?<div className="rounded-2xl p-10 text-center" style={{ background: '#111111', border: '1px dashed rgba(201,168,76,0.2)' }}><p className="text-gray-400 text-sm">No pending PesaJet payments</p></div>:orders.map((order:any)=>(
        <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.35)' }}>
          <div className="flex justify-between mb-2"><div><p className="text-white font-black">{formatUGX(order.amount)} - {order.paymentMethod}</p><p className="text-gray-400 text-xs">+256 {order.phoneNumber}</p></div><span className="text-[10px] px-2 py-1 rounded-full h-fit" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>PENDING</span></div>
          <div className="rounded-xl p-3 mb-3" style={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }}><div className="flex justify-between text-xs"><span className="text-gray-500">Your MTN</span><span className="text-white font-bold">0756406186 (Nabakooza Milly)</span></div><p className="text-[#c9a84c] text-[10px] mt-2">Dial *185*1# → Verify UGX {order.amount} from {order.phoneNumber}</p></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>{if(confirm(`Confirm ${formatUGX(order.amount)} from ${order.phoneNumber}?`)){approveRechargeOrder(order.id);toast.success('Approved!');load();onRefresh();}}} className="py-3 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>💰 Manual Confirm</button>
            <button onClick={()=>{if(confirm('Reject?')){rejectRechargeOrder(order.id);toast.success('Rejected');load();onRefresh();}}} className="py-3 rounded-xl text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('pesajet');
  const [searchQ, setSearchQ] = useState('');
  const [refresh, setRefresh] = useState(0);
  const users = getUsers().filter(u => !u.isAdmin);
  const rechargeOrders = getRechargeOrders();
  const withdrawOrders = getWithdrawOrders();
  const userProducts = getUserProducts();
  const pendingRecharge = rechargeOrders.filter(o => o.status === 'pending');
  const pendingWithdraw = withdrawOrders.filter(o => o.status === 'pending');
  const totalBalance = users.reduce((s,u)=>s+u.balance,0);
  const passwordResets = getPasswordResets();
  
  const tabs = [
    { key: 'pesajet' as AdminTab, label: 'PesaJet', icon: DollarSign, badge: pendingRecharge.length },
    { key: 'overview' as AdminTab, label: 'Overview', icon: BarChart3 },
    { key: 'users' as AdminTab, label: 'Users', icon: Users, badge: users.length },
    { key: 'recharge' as AdminTab, label: 'Recharge', icon: CreditCard, badge: pendingRecharge.length },
    { key: 'withdraw' as AdminTab, label: 'Withdraw', icon: ArrowDownToLine, badge: pendingWithdraw.length },
    { key: 'products' as AdminTab, label: 'Products', icon: Package },
    { key: 'gifts' as AdminTab, label: 'Redeem Code', icon: Gift },
    { key: 'resets' as AdminTab, label: 'Resets', icon: Shield, badge: passwordResets.filter(r=>r.status==='pending').length },
  ];

  const getStatusStyle = (status:string) => {
    if(status==='completed') return { background: 'rgba(201,168,76,0.15)', color: '#c9a84c' };
    if(status==='pending') return { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    return { background: 'rgba(239,68,68,0.15)', color: '#ef4444' };
  };

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <div className="flex items-center justify-between p-4" style={{ background: 'linear-gradient(135deg, #000000, #1a1100)', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}><Shield size={18} className="text-black"/></div>
          <span className="text-white font-black">Admin Panel</span>
          <span className="text-[9px] font-black text-black px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>GOLD • PESAJET • RECHARGE</span>
        </div>
        <button onClick={()=>{setCurrentUser(null);navigate('/login');}} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><LogOut size={15} className="text-gray-400"/></button>
      </div>

      <div className="flex gap-0 overflow-x-auto" style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-bold relative" style={tab===t.key?{color:'#c9a84c',borderBottom:'2px solid #c9a84c'}:{color:'#666'}}>
            <t.icon size={13}/>{t.label}
            {t.badge!==undefined&&t.badge>0&&<span className="absolute top-1 right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="p-4 pb-8">
        {tab==='overview'&&(
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-3xl font-black text-[#c9a84c]">{users.length}</p><p className="text-gray-500 text-xs">Total Users</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-3xl font-black text-[#f0c040]">{pendingRecharge.length}</p><p className="text-gray-500 text-xs">PesaJet Pending (Recharge)</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-3xl font-black text-[#f87171]">{pendingWithdraw.length}</p><p className="text-gray-500 text-xs">Pending Withdraw</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-3xl font-black text-[#34d399]">{userProducts.filter(p=>p.status==='active').length}</p><p className="text-gray-500 text-xs">Active Packages 📦</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-xl font-black text-[#c084fc]">{formatUGX(rechargeOrders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.amount,0))}</p><p className="text-gray-500 text-xs">Total Deposits</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-xl font-black text-[#fb923c]">{withdrawOrders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.amount,0).toLocaleString()} UGX</p><p className="text-gray-500 text-xs">Total Withdrawals</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-xl font-black text-[#2dd4bf]">{formatUGX(totalBalance)}</p><p className="text-gray-500 text-xs">Platform Balance</p></div>
              <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}><p className="text-xl font-black text-[#f472b6]">{getGiftCodes().length}</p><p className="text-gray-500 text-xs">Redeem Codes</p></div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p className="text-[#c9a84c] text-xs font-black">💳 PesaJet uses Recharge table</p>
              <p className="text-white text-sm mt-1">All MTN/Airtel payments are stored as RECHARGE pending → verified here</p>
            </div>
          </div>
        )}

        {tab==='pesajet'&&<PesaJetTab onRefresh={()=>setRefresh(r=>r+1)} />}

        {tab==='users'&&(
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><Search size={14} className="text-gray-500"/><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search phone..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"/></div>
            {users.filter(u=>u.phone.toLowerCase().includes(searchQ.toLowerCase())).map(user=>(
              <div key={user.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
                <div className="flex justify-between mb-2"><p className="text-white font-bold text-sm">{user.phone}</p><span className="text-[10px] font-black text-black px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Lv{user.level}</span></div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-xl p-2 text-center" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}><p className="text-[#c9a84c] font-bold text-sm">{formatUGX(user.balance)}</p><p className="text-gray-600 text-[10px]">Balance • Earnings</p></div>
                  <div className="rounded-xl p-2 text-center" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}><p className="text-white font-bold text-sm">{user.referralCode}</p><p className="text-gray-600 text-[10px]">Team: {users.filter(x=>x.referredBy===user.id).length}</p></div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={()=>{const amt=parseInt(prompt('Add balance (UGX):')||'0');if(amt>0){updateUser(user.id,{balance:user.balance+amt}as any);toast.success(`Added ${formatUGX(amt)}`);setRefresh(r=>r+1);}}} className="py-2 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>+ Add Balance</button>
                  <button onClick={()=>{const amt=parseInt(prompt(`Deduct from ${user.balance}:`)||'0');if(amt>0){updateUser(user.id,{balance:user.balance-amt}as any);toast.success(`Deducted`);setRefresh(r=>r+1);}}} className="py-2 rounded-xl text-xs font-bold text-gray-300" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>- Deduct</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='recharge'&&(
          <div className="space-y-3">
            <p className="text-gray-500 text-xs">{rechargeOrders.length} orders — {pendingRecharge.length} pending (PesaJet uses this table)</p>
            {rechargeOrders.map(order=>{const user=getUsers().find(u=>u.id===order.userId);return(
              <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
                <div className="flex justify-between mb-2"><div><p className="text-white font-bold">{formatUGX(order.amount)}</p><p className="text-gray-400 text-xs">{user?.phone} • {order.paymentMethod}</p></div><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(order.status)}>{order.status}</span></div>
                {order.status==='pending'&&<div className="grid grid-cols-2 gap-2"><button onClick={()=>{approveRechargeOrder(order.id);toast.success('Approved');setRefresh(r=>r+1);}} className="py-2.5 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={()=>{rejectRechargeOrder(order.id);toast.success('Rejected');setRefresh(r=>r+1);}} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}
              </div>
            );})}
          </div>
        )}

        {tab==='withdraw'&&(
          <div className="space-y-3">
            {withdrawOrders.map(order=>{const user=getUsers().find(u=>u.id===order.userId);return(
              <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
                <div className="flex justify-between mb-2"><div><p className="text-white font-bold">{formatUGX(order.amount)}</p><p className="text-gray-400 text-xs">{user?.phone}</p></div><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(order.status)}>{order.status}</span></div>
                {order.status==='pending'&&<div className="grid grid-cols-2 gap-2"><button onClick={()=>{approveWithdrawOrder(order.id);toast.success('Approved');setRefresh(r=>r+1);}} className="py-2.5 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={()=>{rejectWithdrawOrder(order.id);toast.success('Rejected');setRefresh(r=>r+1);}} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}
              </div>
            );})}
          </div>
        )}

        {tab==='products'&&(
          <div className="space-y-3">
            {PRODUCTS.map(product=>{const purchases=getUserProducts().filter(p=>p.productId===product.id);return<div key={product.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between"><div><p className="text-white font-semibold text-sm">VIP{product.vip} {product.name}</p><p className="text-[#c9a84c] font-bold">{formatUGX(product.price)}</p></div><p className="text-white font-black text-xl">{purchases.length}</p></div></div>;})}
          </div>
        )}

        {tab==='gifts'&&(
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p className="text-white font-bold text-sm mb-3">Create Redeem Code (30min)</p>
              <button onClick={()=>{const amt=parseInt(prompt('Amount UGX:')||'0');if(amt>0){const exp=new Date(Date.now()+30*60*1000).toISOString();createGiftCode(amt,undefined,exp);toast.success('Created - 30min expiry');setRefresh(r=>r+1);}}} className="w-full py-3 rounded-xl font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>+ Create Redeem Code</button>
            </div>
            {getGiftCodes().map(gc=>(
              <div key={gc.id} className="rounded-xl p-3 flex justify-between" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
                <div><p className="text-[#c9a84c] font-black text-sm">{gc.code}</p><p className="text-white text-xs">{formatUGX(gc.amount)} {gc.usedBy?'• USED':''}</p></div>
                <button onClick={()=>{deleteGiftCode(gc.id);toast.success('Deleted');setRefresh(r=>r+1);}} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}><Trash2 size={12} className="text-red-400"/></button>
              </div>
            ))}
          </div>
        )}

        {tab==='resets'&&(
          <div className="space-y-3">
            {passwordResets.map((req:PasswordResetRequest)=>(
              <div key={req.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
                <div className="flex justify-between mb-2"><p className="text-white font-bold text-sm">{req.phone}</p><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(req.status)}>{req.status}</span></div>
                {req.status==='pending'&&<div className="grid grid-cols-2 gap-2"><button onClick={()=>{approvePasswordReset(req.id);toast.success('Approved');setRefresh(r=>r+1);}} className="py-2 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={()=>{rejectPasswordReset(req.id);toast.success('Rejected');setRefresh(r=>r+1);}} className="py-2 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
                }
