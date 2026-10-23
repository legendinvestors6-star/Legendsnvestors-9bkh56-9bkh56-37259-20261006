import { useState, useEffect } from 'react';
import { ChevronLeft, Clock, CheckCircle, XCircle, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const formatUGX = (n: number) => `UGX ${Number(n||0).toLocaleString()}`;

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed': return { icon: CheckCircle, label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
    case 'rejected': return { icon: XCircle, label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
    default: return { icon: Clock, label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  }
}

function getExpectedArrival(createdAt: string): string {
  const created = new Date(createdAt);
  const from = new Date(created.getTime() + 4 * 60 * 60 * 1000);
  const to = new Date(created.getTime() + 24 * 60 * 60 * 1000);
  const now = Date.now();
  if (now > to.getTime()) return 'Should have arrived';
  if (now > from.getTime()) {
    const remainMs = to.getTime() - now;
    return `Within ${Math.ceil(remainMs / (60 * 60 * 1000))} hour(s)`;
  }
  return `In ~${Math.ceil((from.getTime() - now) / (60 * 60 * 1000))} hour(s)`;
}

function WithdrawCard({ order }: { order: any }) {
  const cfg = getStatusConfig(order.status);
  const StatusIcon = cfg.icon;
  const isPending = order.status === 'pending';
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(order.created_at).getTime();
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
  }, [order.created_at]);

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ background: '#151515', border: `1px solid ${isPending ? 'rgba(245,158,11,0.3)' : '#2a2a2a'}` }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
        <div className="flex items-center gap-2">
          <StatusIcon size={14} style={{ color: cfg.color }} />
          <span className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
          {isPending && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" /><span className="text-yellow-500 text-[10px]">Processing</span></span>}
        </div>
        <span className="text-gray-600 text-xs">{timeAgo}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div><p className="text-gray-500 text-xs mb-0.5">Withdrawal Amount</p><p className="text-white font-black text-2xl">{formatUGX(order.amount)}</p></div>
          <div className="text-right"><p className="text-gray-500 text-xs mb-0.5">You Receive</p><p className="font-black text-xl" style={{ color: '#c9a84c' }}>{formatUGX(order.received_amount || order.amount * 0.84)}</p></div>
        </div>
        <div className="rounded-xl p-3 mb-3" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>
          <p className="text-gray-500 text-xs font-semibold mb-2 uppercase">Fee Breakdown</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Gross Amount</span><span className="text-white">{formatUGX(order.amount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Service Fee (16%)</span><span className="text-red-400">-{formatUGX(order.fee || order.amount * 0.16)}</span></div>
            <div className="h-px" style={{ background: '#333' }} />
            <div className="flex justify-between text-xs font-bold"><span className="text-gray-400">Net Received</span><span style={{ color: '#c9a84c' }}>{formatUGX(order.received_amount || order.amount * 0.84)}</span></div>
          </div>
        </div>
        <div className="rounded-xl p-3 mb-3" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-2 mb-2"><CreditCard size={13} className="text-[#c9a84c]" /><p className="text-gray-500 text-xs font-semibold uppercase">Destination</p></div>
          <div className="flex items-center justify-between">
            <div><p className="text-white font-semibold text-sm">{order.bank || order.bank_card?.bank || 'N/A'}</p><p className="text-gray-500 text-xs">{order.account_number || order.bank_card?.accountNumber || 'N/A'}</p></div>
            <div className="w-10 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: (order.bank === 'MTN' ? '#ffcc00' : '#ef3a3a'), color: order.bank === 'MTN' ? '#000' : '#fff' }}>{order.bank || 'BANK'}</div>
          </div>
        </div>
        {isPending && <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}><p className="text-yellow-400 text-xs font-semibold">Expected Arrival: {getExpectedArrival(order.created_at)}</p></div>}
        {order.status === 'rejected' && <div className="rounded-xl p-3 flex gap-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertCircle size={13} className="text-red-400" /><p className="text-red-400 text-xs">Rejected - Balance refunded</p></div>}
        <p className="text-gray-700 text-[10px] mt-3 text-right">Submitted: {new Date(order.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function WithdrawStatusPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }
    const { data } = await supabase.from('withdraw_orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  // Auto-refresh + realtime
  useEffect(() => {
    const iv = setInterval(loadOrders, 15000);
    const channel = supabase.channel('withdraw-status').on('postgres_changes', { event: '*', schema: 'public', table: 'withdraw_orders' }, () => loadOrders()).subscribe();
    return () => { clearInterval(iv); supabase.removeChannel(channel); };
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const pending = orders.filter(o => o.status === 'pending').length;
  const approved = orders.filter(o => o.status === 'completed').length;
  const rejected = orders.filter(o => o.status === 'rejected').length;
  const totalWithdrawn = orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.received_amount || o.amount), 0);

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 p-4" style={{ background: '#111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}><ChevronLeft size={18} className="text-gray-400" /></button>
        <h1 className="text-white font-bold text-lg flex-1">Withdrawal Status</h1>
        <button onClick={loadOrders} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}><RefreshCw size={14} className="text-gray-400" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <div className="rounded-2xl p-4 col-span-2" style={{ background: 'linear-gradient(135deg, #1a1100, #2a1f00)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <p className="text-gray-500 text-xs mb-1">Total Successfully Withdrawn</p><p className="text-[#c9a84c] font-black text-2xl">{formatUGX(totalWithdrawn)}</p>
        </div>
        <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}><p className="font-black text-2xl text-yellow-400">{pending}</p><p className="text-gray-500 text-xs">Pending</p></div>
        <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}><p className="font-black text-2xl text-green-400">{approved}</p><p className="text-gray-500 text-xs">Approved</p></div>
      </div>

      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {[{key:'all',label:'All',count:orders.length},{key:'pending',label:'Pending',count:pending},{key:'completed',label:'Approved',count:approved},{key:'rejected',label:'Rejected',count:rejected}].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key as any)} className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            style={filter===t.key?{background:'linear-gradient(135deg, #c9a84c, #f0c040)',color:'#000'}:{background:'#1a1a1a',color:'#666',border:'1px solid #222'}}>{t.label}<span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black" style={filter===t.key?{background:'rgba(0,0,0,0.3)'}:{background:'#2a2a2a'}}>{t.count}</span></button>
        ))}
      </div>

      <div className="px-4 pb-6">
        {filtered.length===0 ? <div className="rounded-2xl p-12 text-center" style={{background:'#151515'}}><p className="text-gray-500 text-sm">No withdrawal records</p><button onClick={()=>navigate('/withdraw')} className="mt-4 px-4 py-2.5 rounded-xl text-sm font-bold text-black" style={{background:'#c9a84c'}}>Make a Withdrawal</button></div> : filtered.map(order => <WithdrawCard key={order.id} order={order} />)}
      </div>
    </div>
  );
}