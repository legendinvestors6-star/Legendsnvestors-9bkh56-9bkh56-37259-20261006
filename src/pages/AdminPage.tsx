import { useState, useEffect } from 'react';
import {
  Users, CreditCard, ArrowDownToLine, BarChart3, Check, X, Search,
  LogOut, Shield, TrendingUp, Gift, Bell, DollarSign, Trash2, Eye, Copy, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getUsers, getRechargeOrders, getWithdrawOrders, getUserProducts,
  approveRechargeOrder, rejectRechargeOrder, approveWithdrawOrder, rejectWithdrawOrder,
  setCurrentUser, formatUGX, updateUser, addTransaction, getTransactions,
  getGiftCodes, createGiftCode, deleteGiftCode,
  getPasswordResets, approvePasswordReset, rejectPasswordReset
} from '@/lib/storage';
import type { PasswordResetRequest } from '@/lib/storage';
import type { GiftCode } from '@/lib/storage';
import type { User, RechargeOrder, WithdrawOrder } from '@/types';
import { PRODUCTS } from '@/constants/products';

type AdminTab = 'overview' | 'users' | 'recharge' | 'withdraw' | 'products' | 'gifts' | 'resets' | 'pesajet';

// PESAJET TAB - Uses Recharge for PesaJet (BLACK & GOLD)
function PesaJetTab({ onRefresh }: { onRefresh: () => void }) {
  const [pesajetOrders, setPesajetOrders] = useState<RechargeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPesaJet = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pesajet/list').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setPesajetOrders(data.transactions || []);
      } else {
        const orders = getRechargeOrders().filter(o => o.status === 'pending');
        setPesajetOrders(orders);
      }
    } catch {
      const orders = getRechargeOrders().filter(o => o.status === 'pending');
      setPesajetOrders(orders);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPesaJet(); }, []);

  const verifyPayment = async (orderId: string, phone: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/pesajet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, phone })
      });
      const data = await res.json().catch(() => ({ status: 'pending' }));
      
      if (data.status === 'completed' || data.status === 'SUCCESS' || data.status === 'success') {
        toast.success(`PesaJet Verified! UGX ${data.amount || ''} paid - Approving...`);
        approveRechargeOrder(orderId);
        onRefresh();
        fetchPesaJet();
        toast.success('Recharge approved & balance credited!');
      } else {
        toast.error(`Not paid yet: ${data.status || 'pending'} - Ask user to complete PIN`);
      }
    } catch (e:any) {
      toast.error('Verification failed - Use Manual Confirm if you saw money in MTN');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.4)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
            <span className="text-black font-black text-xs">PesaJet</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">PesaJet Pay Verification</p>
            <p className="text-[#c9a84c] text-[10px]">Auto-verify MTN MoMo & Airtel Money</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(201,168,76,0.15)' }}>
            <p className="text-[#c9a84c] font-black text-lg">{pesajetOrders.length}</p>
            <p className="text-gray-500 text-[10px]">Pending</p>
          </div>
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(201,168,76,0.15)' }}>
            <p className="text-green-400 font-black text-xs">Webhook</p>
            <p className="text-gray-500 text-[10px]">Auto Active</p>
          </div>
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(201,168,76,0.15)' }}>
            <p className="text-white font-black text-xs">MTN • Airtel</p>
            <p className="text-gray-500 text-[10px]">Uganda</p>
          </div>
        </div>
      </div>

      <button onClick={fetchPesaJet} className="w-full py-3 rounded-xl text-xs font-black text-black flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)', boxShadow: '0 4px 15px rgba(201,168,76,0.3)' }}>
        {loading ? '⏳ Checking...' : '🔄 Refresh PesaJet Status'}
      </button>

      {pesajetOrders.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#111111', border: '1px dashed rgba(201,168,76,0.2)' }}>
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(201,168,76,0.1)' }}>
            <DollarSign size={20} className="text-[#c9a84c]" />
          </div>
          <p className="text-white text-sm font-semibold">No pending PesaJet payments</p>
          <p className="text-gray-500 text-xs mt-1">When user pays via MTN/Airtel, it appears here automatically via webhook</p>
        </div>
      ) : (
        pesajetOrders.map((order:any) => (
          <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.35)' }}>
            <div className="flex justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-white font-black text-base">{formatUGX(order.amount)}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${order.paymentMethod === 'MTN' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {order.paymentMethod === 'MTN' ? 'MTN MoMo' : 'Airtel Money'}
                  </span>
                </div>
                <p className="text-gray-300 text-xs font-medium mt-1">Sender: +256 {order.phoneNumber}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">Order: {order.id.slice(0,12)}... • {new Date(order.createdAt).toLocaleTimeString()}</p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full font-bold h-fit" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                PENDING
              </span>
            </div>
            
            <div className="rounded-xl p-3 mb-3 space-y-2" style={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }}>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Amount to verify</span>
                <span className="text-[#c9a84c] font-black">{formatUGX(order.amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Sender number</span>
                <span className="text-white font-semibold">+256 {order.phoneNumber}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Your MTN account</span>
                <span className="text-white font-semibold">0756406186 (Nabakooza Milly)</span>
              </div>
              <div className="rounded-lg p-2 mt-2" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                <p className="text-[#c9a84c] text-[10px] font-semibold">📱 How to verify:</p>
                <p className="text-gray-400 text-[10px] mt-1">Dial *185*1# → Check MTN balance or MoMoPay transactions → Look for UGX {order.amount} from {order.phoneNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => verifyPayment(order.id, order.phoneNumber)}
                className="py-3 rounded-xl text-xs font-black text-black flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
                <span>✓</span> Verify PesaJet
              </button>
              <button onClick={() => {
                if (confirm(`CONFIRM: Have you received UGX ${order.amount.toLocaleString()} from +256 ${order.phoneNumber} in your MTN MoMo?\n\nClick OK to approve & credit user.`)) {
                  approveRechargeOrder(order.id);
                  toast.success(`Approved! UGX ${order.amount} credited to user!`);
                  onRefresh();
                  fetchPesaJet();
                }
              }} className="py-3 rounded-xl text-xs font-bold text-green-400 flex items-center justify-center gap-1"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                💰 Manual Confirm
              </button>
            </div>
            
            <button onClick={() => {
              if (confirm('Reject this recharge? Money will NOT be credited.')) {
                rejectRechargeOrder(order.id);
                toast.success('Rejected');
                onRefresh();
                fetchPesaJet();
              }
            }} className="w-full mt-2 py-2 rounded-xl text-[10px] text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              Reject Order
            </button>
          </div>
        ))
      )}

      <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
        <p className="text-white font-bold text-xs mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-black text-[10px] font-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>?</span>
          How PesaJet Auto-Payment Works
        </p>
        <div className="space-y-2 text-[11px] text-gray-400">
          <div className="flex gap-2"><span className="text-[#c9a84c] font-bold">1.</span><span>User enters amount + MTN number on Recharge page → App calls /api/pesajet/create-payment</span></div>
          <div className="flex gap-2"><span className="text-[#c9a84c] font-bold">2.</span><span>PesaJet sends prompt to user's phone → User enters MoMo PIN to pay</span></div>
          <div className="flex gap-2"><span className="text-[#c9a84c] font-bold">3.</span><span>PesaJet calls webhook /api/pesajet/webhook with SUCCESS</span></div>
          <div className="flex gap-2"><span className="text-[#c9a84c] font-bold">4.</span><span>Webhook auto-approves & credits user balance instantly</span></div>
          <div className="flex gap-2"><span className="text-[#c9a84c] font-bold">5.</span><span>If webhook fails, you verify here manually in PesaJet tab</span></div>
        </div>
        <div className="mt-3 p-2.5 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <p className="text-green-400 text-[10px] font-semibold">💡 Pro Tip: Add PesaJet API keys in Vercel Env to enable full auto mode!</p>
        </div>
      </div>
    </div>
  );
}

function GiftToolsTab({ users, rechargeOrders, withdrawOrders, onRefresh }: {
  users: User[];
  rechargeOrders: RechargeOrder[];
  withdrawOrders: WithdrawOrder[];
  onRefresh: () => void;
}) {
  const [giftCode, setGiftCode] = useState('');
  const [giftAmount, setGiftAmount] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [creditUser, setCreditUser] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [deductUser, setDeductUser] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>(() => getGiftCodes());
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const refreshCodes = () => setGiftCodes(getGiftCodes());

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Gift size={16} className="text-[#c9a84c]" />
          <p className="text-white font-bold text-sm">Create Gift Code (30min expiry)</p>
        </div>
        <div className="space-y-2">
          <input value={giftCode} onChange={e => setGiftCode(e.target.value.toUpperCase())}
            placeholder="Custom code (optional — auto-generated if empty)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none uppercase tracking-widest"
            style={{ background: '#0a0a0a', border: '1px solid #333' }} />
          <input value={giftAmount} onChange={e => setGiftAmount(e.target.value)}
            type="number" placeholder="Amount (UGX)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: '#0a0a0a', border: '1px solid #333' }} />
          <input value={giftNote} onChange={e => setGiftNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: '#0a0a0a', border: '1px solid #333' }} />
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <span className="text-[#c9a84c] text-xs">⏱</span>
            <span className="text-[#c9a84c] text-xs font-medium">Auto-expires 30 minutes after creation</span>
          </div>
          <button onClick={() => {
            const amt = parseInt(giftAmount);
            if (amt <= 0 || isNaN(amt)) { toast.error('Enter valid amount'); return; }
            const expiresAt = new Date(Date.now() + 30*60*1000).toISOString();
            try {
              const created = createGiftCode(amt, giftNote || undefined, expiresAt, giftCode || undefined);
              toast.success(`Gift code created: ${created.code} - 30min`);
              setGiftCode(''); setGiftAmount(''); setGiftNote('');
              refreshCodes(); onRefresh();
            } catch (e:any) {
              toast.error(e.message || 'Code exists - use different code');
            }
          }} className="w-full py-3 rounded-xl font-black text-black text-sm flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
            <Plus size={15} /> Generate Gift Code
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.25)' }}>
        <p className="text-white font-bold text-sm mb-3">Gift Code Summary</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Total Created', value: giftCodes.length, color: '#c9a84c' },
            { label: 'Total Redeemed', value: giftCodes.filter(c => c.usedBy).length, color: '#22c55e' },
            { label: 'UGX Distributed', value: formatUGX(giftCodes.filter(c => c.usedBy).reduce((s, c) => s + c.amount, 0)), color: '#f0c040' },
            { label: 'Available / Expired', value: `${giftCodes.filter(c => !c.usedBy && !(c.expiresAt && new Date(c.expiresAt) < new Date())).length} / ${giftCodes.filter(c => !c.usedBy && c.expiresAt && new Date(c.expiresAt) < new Date()).length}`, color: '#60a5fa' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }}>
              <p className="font-black text-sm" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold text-sm">Gift Codes ({giftCodes.length})</p>
          <span className="text-[10px] text-gray-500">{giftCodes.filter(c => !c.usedBy).length} available</span>
        </div>
        {giftCodes.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-4">No gift codes yet.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {giftCodes.map(gc => (
              <div key={gc.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: '#0a0a0a', border: `1px solid ${gc.usedBy ? '#2a2a2a' : 'rgba(201,168,76,0.2)'}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black tracking-widest text-sm" style={{ color: gc.usedBy ? '#555' : '#c9a84c' }}>{gc.code}</span>
                    {!gc.usedBy && (
                      <button onClick={() => { navigator.clipboard.writeText(gc.code); toast.success('Copied!'); }} className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#222' }}>
                        <Copy size={11} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                  <p className="text-[#c9a84c] text-xs font-bold">{formatUGX(gc.amount)}</p>
                  {gc.usedBy ? <p className="text-green-400 text-[10px]">✓ Redeemed</p> : gc.expiresAt && new Date(gc.expiresAt) < new Date() ? <p className="text-red-400 text-[10px]">Expired</p> : gc.expiresAt ? (() => { const ms = new Date(gc.expiresAt).getTime() - Date.now(); const m = Math.max(0, Math.floor(ms/60000)); const s = Math.max(0, Math.floor((ms%60000)/1000)); return <p className="text-[#c9a84c] text-[10px]">⏱ {m}m {s}s left</p>; })() : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={gc.usedBy ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e' } : gc.expiresAt && new Date(gc.expiresAt) < new Date() ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444' } : { background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }}>{gc.usedBy ? 'USED' : gc.expiresAt && new Date(gc.expiresAt) < new Date() ? 'EXPIRED' : 'ACTIVE'}</span>
                  <button onClick={() => { deleteGiftCode(gc.id); refreshCodes(); toast.success('Deleted'); }} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}><Trash2 size={11} className="text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center gap-2 mb-3"><DollarSign size={16} className="text-[#c9a84c]" /><p className="text-white font-bold text-sm">Credit Balance</p></div>
        <div className="space-y-2">
          <select value={creditUser} onChange={e => setCreditUser(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={{ background: '#0a0a0a', border: '1px solid #333' }}>
            <option value="">Select user...</option>{users.map(u => <option key={u.id} value={u.id}>{u.phone} — {formatUGX(u.balance)}</option>)}
          </select>
          <input value={creditAmount} onChange={e => setCreditAmount(e.target.value)} type="number" placeholder="Amount (UGX)" className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={{ background: '#0a0a0a', border: '1px solid #333' }} />
          <input value={creditNote} onChange={e => setCreditNote(e.target.value)} placeholder="Note" className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={{ background: '#0a0a0a', border: '1px solid #333' }} />
          <button onClick={() => { const amt = parseInt(creditAmount); if (!creditUser || !amt) { toast.error('Select user & amount'); return; } const usr = getUsers().find(u => u.id === creditUser); if (!usr) return; updateUser(creditUser, { balance: usr.balance + amt, cumulativeIncome: usr.cumulativeIncome + amt } as any); addTransaction({ userId: creditUser, type: 'income', amount: amt, status: 'completed', description: creditNote || 'Admin credit' } as any); toast.success(`Credited ${formatUGX(amt)}`); setCreditUser(''); setCreditAmount(''); setCreditNote(''); onRefresh(); }} className="w-full py-3 rounded-xl font-black text-black text-sm" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Credit Balance</button>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center gap-2 mb-3"><Trash2 size={16} className="text-red-400" /><p className="text-white font-bold text-sm">Deduct Balance</p></div>
        <div className="space-y-2">
          <select value={deductUser} onChange={e => setDeductUser(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={{ background: '#0a0a0a', border: '1px solid #333' }}>
            <option value="">Select user...</option>{users.map(u => <option key={u.id} value={u.id}>{u.phone} — {formatUGX(u.balance)}</option>)}
          </select>
          <input value={deductAmount} onChange={e => setDeductAmount(e.target.value)} type="number" placeholder="Amount to deduct" className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none" style={{ background: '#0a0a0a', border: '1px solid #333' }} />
          <button onClick={() => { const amt = parseInt(deductAmount); if (!deductUser || !amt) { toast.error('Select user'); return; } const usr = getUsers().find(u => u.id === deductUser); if (!usr || amt > usr.balance) { toast.error('Exceeds balance'); return; } updateUser(deductUser, { balance: usr.balance - amt } as any); toast.success(`Deducted ${formatUGX(amt)}`); setDeductUser(''); setDeductAmount(''); onRefresh(); }} className="w-full py-3 rounded-xl font-bold text-red-400 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>Deduct Balance</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [searchQ, setSearchQ] = useState('');
  const [refresh, setRefresh] = useState(0);

  const users = getUsers().filter(u => !u.isAdmin);
  const rechargeOrders = getRechargeOrders();
  const withdrawOrders = getWithdrawOrders();
  const userProducts = getUserProducts();

  const pendingRecharge = rechargeOrders.filter(o => o.status === 'pending');
  const pendingWithdraw = withdrawOrders.filter(o => o.status === 'pending');
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);
  const totalRecharge = rechargeOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0);

  const handleApproveRecharge = (orderId: string) => { approveRechargeOrder(orderId); toast.success('Recharge approved'); setRefresh(r => r + 1); };
  const handleRejectRecharge = (orderId: string) => { rejectRechargeOrder(orderId); toast.success('Recharge rejected'); setRefresh(r => r + 1); };
  const handleApproveWithdraw = (orderId: string) => { approveWithdrawOrder(orderId); toast.success('Withdrawal approved'); setRefresh(r => r + 1); };
  const handleRejectWithdraw = (orderId: string) => { rejectWithdrawOrder(orderId); toast.success('Withdrawal rejected'); setRefresh(r => r + 1); };
  const handleLogout = () => { setCurrentUser(null); navigate('/login'); };

  const filteredUsers = users.filter(u => u.phone.toLowerCase().includes(searchQ.toLowerCase()));
  const passwordResets = getPasswordResets();
  const pendingResets = passwordResets.filter(r => r.status === 'pending');

  const tabs = [
    { key: 'overview' as AdminTab, label: 'Overview', icon: BarChart3 },
    { key: 'users' as AdminTab, label: 'Users', icon: Users, badge: users.length },
    { key: 'pesajet' as AdminTab, label: 'PesaJet', icon: DollarSign, badge: pendingRecharge.length },
    { key: 'recharge' as AdminTab, label: 'Recharge', icon: CreditCard, badge: pendingRecharge.length },
    { key: 'withdraw' as AdminTab, label: 'Withdraw', icon: ArrowDownToLine, badge: pendingWithdraw.length },
    { key: 'products' as AdminTab, label: 'Products', icon: TrendingUp },
    { key: 'resets' as AdminTab, label: 'Resets', icon: Shield, badge: pendingResets.length },
    { key: 'gifts' as AdminTab, label: 'Tools', icon: Gift },
  ];

  const getStatusStyle = (status: string) => {
    if (status === 'completed') return { background: 'rgba(201,168,76,0.15)', color: '#c9a84c' };
    if (status === 'pending') return { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    return { background: 'rgba(239,68,68,0.15)', color: '#ef4444' };
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#000000' }}>
      <div className="flex items-center justify-between p-4" style={{ background: 'linear-gradient(135deg, #000000, #1a1100)', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
            <Shield size={18} className="text-black" />
          </div>
          <span className="text-white font-black text-lg">Admin Panel</span>
          <span className="text-[9px] font-black text-black px-2 py-0.5 rounded-full ml-1" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>PESAJET • GOLD</span>
        </div>
        <button onClick={handleLogout} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
          <LogOut size={15} className="text-gray-400" />
        </button>
      </div>

      <div className="flex gap-0 overflow-x-auto" style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-bold relative"
              style={tab === t.key ? { color: '#c9a84c', borderBottom: '2px solid #c9a84c' } : { color: '#666' }}>
              <Icon size={13} />{t.label}
              {t.badge !== undefined && t.badge > 0 && <span className="absolute top-1 right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>{t.badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="p-4 pb-8">
        {tab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[{ label: 'Total Users', value: users.length, color: '#c9a84c' }, { label: 'PesaJet Pending', value: pendingRecharge.length, color: '#f0c040' }, { label: 'Pending Withdraw', value: pendingWithdraw.length, color: '#f87171' }, { label: 'Active Products', value: userProducts.filter(p => p.status === 'active').length, color: '#34d399' }].map(stat => (
                <div key={stat.label} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}>
                  <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.2)' }}>
              <p className="text-gray-500 text-xs">Total Platform Balance</p>
              <p className="text-[#c9a84c] text-2xl font-black">{formatUGX(totalBalance)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p className="text-[#c9a84c] text-xs font-black">💳 PesaJet Payment Gateway</p>
              <p className="text-white text-sm mt-1">MTN MoMo & Airtel Money auto-verification active</p>
              <p className="text-gray-400 text-xs mt-1">Go to PesaJet tab to verify pending payments - Uses Recharge</p>
            </div>
          </div>
        )}

        {tab === 'pesajet' && <PesaJetTab onRefresh={() => setRefresh(r => r + 1)} />}

        {tab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
              <Search size={14} className="text-gray-500" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search phone..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600" />
            </div>
            {filteredUsers.map(user => (
              <div key={user.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
                <div className="flex justify-between mb-2"><p className="text-white font-bold text-sm">{user.phone}</p><span className="text-[10px] font-black text-black px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Lv{user.level}</span></div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-xl p-2 text-center" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}><p className="text-[#c9a84c] font-bold text-sm">{formatUGX(user.balance)}</p><p className="text-gray-600 text-[10px]">Balance</p></div>
                  <div className="rounded-xl p-2 text-center" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}><p className="text-white font-bold text-sm">{user.referralCode}</p><p className="text-gray-600 text-[10px]">Code</p></div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={() => { const amt = parseInt(prompt('Add balance (UGX):') || '0'); if (amt > 0) { updateUser(user.id, { balance: user.balance + amt } as any); toast.success(`Added ${formatUGX(amt)}`); setRefresh(r => r + 1); } }} className="py-2 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>+ Add</button>
                  <button onClick={() => { const pwd = prompt('New password:'); if (pwd) { updateUser(user.id, { password: pwd } as any); toast.success('Password updated'); } }} className="py-2 rounded-xl text-xs font-bold text-gray-300" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>Reset Pwd</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'recharge' && (
          <div className="space-y-3">
            <p className="text-gray-500 text-xs">{rechargeOrders.length} orders — {pendingRecharge.length} pending (Check PesaJet tab - Uses Recharge)</p>
            {rechargeOrders.map(order => {
              const user = getUsers().find(u => u.id === order.userId);
              return (
                <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
                  <div className="flex justify-between mb-2"><div><p className="text-white font-bold">{formatUGX(order.amount)}</p><p className="text-gray-400 text-xs">{user?.phone} • {order.paymentMethod}</p></div><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(order.status)}>{order.status}</span></div>
                  {order.status === 'pending' && <div className="grid grid-cols-2 gap-2"><button onClick={() => handleApproveRecharge(order.id)} className="py-2.5 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={() => handleRejectRecharge(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>Reject</button></div>}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'withdraw' && (
          <div className="space-y-3">
            {withdrawOrders.map(order => {
              const user = getUsers().find(u => u.id === order.userId);
              return (
                <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
                  <div className="flex justify-between mb-2"><div><p className="text-white font-bold">{formatUGX(order.amount)}</p><p className="text-gray-400 text-xs">{user?.phone}</p></div><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(order.status)}>{order.status}</span></div>
                  {order.status === 'pending' && <div className="grid grid-cols-2 gap-2"><button onClick={() => handleApproveWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={() => handleRejectWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>Reject</button></div>}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'products' && (
          <div className="space-y-3">
            {PRODUCTS.map(product => {
              const purchases = userProducts.filter(p => p.productId === product.id);
              return <div key={product.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}><div className="flex justify-between"><div><p className="text-white font-semibold text-sm">VIP{product.vip} {product.name}</p><p className="text-[#c9a84c] font-bold">{formatUGX(product.price)}</p></div><p className="text-white font-black text-xl">{purchases.length}</p></div></div>;
            })}
          </div>
        )}

        {tab === 'resets' && (
          <div className="space-y-3">
            {passwordResets.map((req: PasswordResetRequest) => (
              <div key={req.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
                <div className="flex justify-between mb-2"><p className="text-white font-bold text-sm">{req.phone}</p><span className="text-[10px] px-2 py-1 rounded-full" style={getStatusStyle(req.status)}>{req.status}</span></div>
                {req.status === 'pending' && <div className="grid grid-cols-2 gap-2"><button onClick={() => { approvePasswordReset(req.id); toast.success('Approved'); setRefresh(r => r + 1); }} className="py-2 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button><button onClick={() => { rejectPasswordReset(req.id); toast.success('Rejected'); setRefresh(r => r + 1); }} className="py-2 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button></div>}
              </div>
            ))}
          </div>
        )}

        {tab === 'gifts' && <GiftToolsTab users={users} rechargeOrders={rechargeOrders} withdrawOrders={withdrawOrders} onRefresh={() => setRefresh(r => r + 1)} />}
      </div>
    </div>
  );
                }
