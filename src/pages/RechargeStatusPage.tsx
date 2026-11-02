import { useState, useEffect } from 'react';
import { ChevronLeft, Clock, CheckCircle, XCircle, CreditCard, RefreshCw, Smartphone, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) return JSON.parse(raw).id;
    return localStorage.getItem('legend_current_user');
  } catch { return null; }
}

const formatUGX = (n: number) => `UGX ${Number(n||0).toLocaleString()}`;

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return { icon: CheckCircle, label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
    case 'rejected':
      return { icon: XCircle, label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
    default:
      return { icon: Clock, label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  }
}

function RechargeCard({ order }: { order: any }) {
  const cfg = getStatusConfig(order.status);
  const StatusIcon = cfg.icon;
  const isPending = order.status === 'pending';
  const isMTN = order.payment_method === 'mtn' || order.paymentMethod === 'MTN';
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(order.created_at || order.createdAt).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      if (days > 0) setTimeAgo(`${days}d ago`);
      else if (hrs > 0) setTimeAgo(`${hrs}h ago`);
      else if (mins > 0) setTimeAgo(`${mins}m ago`);
      else setTimeAgo('Just now');
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [order.created_at, order.createdAt]);

  const amount = order.amount;
  const method = order.payment_method || order.paymentMethod || 'MTN';
  const phoneNum = order.phone_number || order.phoneNumber;

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ background: '#151515', border: `1px solid ${isPending ? 'rgba(245,158,11,0.3)' : '#2a2a2a'}` }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
        <div className="flex items-center gap-2">
          <StatusIcon size={14} style={{ color: cfg.color }} />
          <span className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
          {isPending && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" /><span className="text-yellow-500 text-[10px]">Awaiting verification</span></span>}
        </div>
        <span className="text-gray-600 text-xs">{timeAgo}</span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div><p className="text-gray-500 text-xs mb-0.5">Recharge Amount</p><p className="text-white font-black text-2xl">{formatUGX(amount)}</p></div>
          <div className="text-right"><p className="text-gray-500 text-xs mb-0.5">Method</p><div className="flex items-center gap-1.5 justify-end"><div className="w-8 h-5 rounded flex items-center justify-center text-[9px] font-black" style={{ background: isMTN ? '#ffcc00' : '#ef3a3a', color: isMTN ? '#000' : '#fff' }}>{isMTN ? 'MTN' : 'AIR'}</div><span className="text-white font-semibold text-sm">{method}</span></div></div>
        </div>

        <div className="rounded-xl p-3 mb-3" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>
          <p className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wider">Payment Details</p>
          <div className="space-y-2">
            {phoneNum && <div className="flex justify-between items-center text-xs"><span className="text-gray-500 flex items-center gap-1"><Smartphone size={11} /> Sender Number</span><span className="text-white font-semibold">+256 {phoneNum}</span></div>}
          </div>
        </div>

        {isPending && <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}><Clock size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" /><div><p className="text-yellow-400 text-xs font-semibold">Under Review</p><p className="text-gray-500 text-[10px] mt-0.5">Your recharge is being verified by our team. Allow 2–5 minutes.</p></div></div>}
        {order.status === 'completed' && <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}><CheckCircle size={13} className="text-green-400 flex-shrink-0 mt-0.5" /><div><p className="text-green-400 text-xs font-semibold">Recharge Approved</p><p className="text-gray-500 text-[10px] mt-0.5">{formatUGX(amount)} has been credited.</p></div></div>}
        {order.status === 'rejected' && <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" /><div><p className="text-red-400 text-xs font-semibold">Recharge Rejected</p><p className="text-gray-500 text-[10px] mt-0.5">Contact support.</p></div></div>}

        <p className="text-gray-700 text-[10px] text-right">Submitted: {new Date(order.created_at || order.createdAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function RechargeStatusPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      const userId = getCurrentUserId();
      if (!userId) { navigate('/login'); return; }
      setCurrentUser({ id: userId });

      // FIXED: Load from Supabase + localStorage fallback
      let allOrders: any[] = [];
      
      try {
        const { data } = await supabase.from('recharge_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (data) allOrders = data;
      } catch (e) { console.log('supabase error', e); }

      // Also include localStorage orders if any
      try {
        const local = JSON.parse(localStorage.getItem('legend_recharge_orders') || '[]');
        const localFiltered = local.filter((o: any) => o.userId === userId);
        // Merge, dedup by id
        const ids = new Set(allOrders.map((o: any) => o.id));
        localFiltered.forEach((o: any) => { if (!ids.has(o.id)) allOrders.push({ ...o, created_at: o.createdAt, amount: o.amount, status: o.status, payment_method: o.paymentMethod, phone_number: o.phoneNumber }); });
      } catch {}

      setOrders(allOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    };
    load();
  }, [navigate, lastRefresh]);

  useEffect(() => { const iv = setInterval(() => setLastRefresh(Date.now()), 30000); return () => clearInterval(iv); }, []);

  if (!currentUser) return null;

  const pending = orders.filter((o) => o.status === 'pending').length;
  const approved = orders.filter((o) => o.status === 'completed').length;
  const rejected = orders.filter((o) => o.status === 'rejected').length;
  const totalRecharged = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + Number(o.amount || 0), 0);
  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const tabs = [{ key: 'all' as const, label: 'All', count: orders.length }, { key: 'pending' as const, label: 'Pending', count: pending }, { key: 'completed' as const, label: 'Approved', count: approved }, { key: 'rejected' as const, label: 'Rejected', count: rejected }];

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}><ChevronLeft size={18} className="text-gray-400" /></button>
        <h1 className="text-white font-bold text-lg flex-1">Recharge Status</h1>
        <button onClick={() => setLastRefresh(Date.now())} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}><RefreshCw size={14} className="text-gray-400" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <div className="rounded-2xl p-4 col-span-2" style={{ background: 'linear-gradient(135deg, #1a1100, #2a1f00)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <p className="text-gray-500 text-xs mb-1">Total Successfully Recharged</p>
          <p className="text-[#c9a84c] font-black text-2xl">{formatUGX(totalRecharged)}</p>
          <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(201,168,76,0.15)' }}>
            <div><p className="text-white font-black text-lg">{orders.length}</p><p className="text-gray-600 text-[10px]">Total Orders</p></div>
            <div><p className="text-yellow-400 font-black text-lg">{pending}</p><p className="text-gray-600 text-[10px]">Pending</p></div>
            <div><p className="text-green-400 font-black text-lg">{approved}</p><p className="text-gray-600 text-[10px]">Approved</p></div>
            <div><p className="text-red-400 font-black text-lg">{rejected}</p><p className="text-gray-600 text-[10px]">Rejected</p></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)} className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5" style={filter === t.key ? { background: 'linear-gradient(135deg, #c9a84c, #f0c040)', color: '#000' } : { background: '#1a1a1a', color: '#666', border: '1px solid #222' }}>
            {t.label}{t.count > 0 && <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black" style={filter === t.key ? { background: 'rgba(0,0,0,0.3)', color: '#000' } : { background: '#2a2a2a', color: '#888' }}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center mt-2" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <CreditCard size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No recharge records</p>
            <p className="text-gray-700 text-xs mt-1">Your recharge requests will appear here</p>
            <button onClick={() => navigate('/recharge')} className="mt-4 px-4 py-2.5 rounded-xl text-sm font-bold text-black" style={{background:'#c9a84c'}}>Make a Recharge</button>
          </div>
        ) : ( filtered.map((order) => <RechargeCard key={order.id} order={order} />) )}
      </div>
    </div>
  );
                           }
