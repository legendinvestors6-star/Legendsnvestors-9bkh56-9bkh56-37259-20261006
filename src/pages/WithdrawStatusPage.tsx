import { useState, useEffect } from 'react';
import { ChevronLeft, Clock, CheckCircle, XCircle, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getWithdrawOrders, formatUGX } from '@/lib/storage';
import type { WithdrawOrder } from '@/types';

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle,
        label: 'Approved',
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.1)',
        border: 'rgba(34,197,94,0.25)',
      };
    case 'rejected':
      return {
        icon: XCircle,
        label: 'Rejected',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
        border: 'rgba(239,68,68,0.25)',
      };
    default:
      return {
        icon: Clock,
        label: 'Pending',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.1)',
        border: 'rgba(245,158,11,0.25)',
      };
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
    const remainH = Math.ceil(remainMs / (60 * 60 * 1000));
    return `Within ${remainH} hour(s)`;
  }
  const waitMs = from.getTime() - now;
  const waitH = Math.ceil(waitMs / (60 * 60 * 1000));
  return `In ~${waitH} hour(s)`;
}

function WithdrawCard({ order }: { order: WithdrawOrder }) {
  const cfg = getStatusConfig(order.status);
  const StatusIcon = cfg.icon;
  const isPending = order.status === 'pending';
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(order.createdAt).getTime();
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
  }, [order.createdAt]);

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{
      background: '#151515',
      border: `1px solid ${isPending ? 'rgba(245,158,11,0.3)' : '#2a2a2a'}`,
    }}>
      {/* Status Banner */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{
        background: cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
      }}>
        <div className="flex items-center gap-2">
          <StatusIcon size={14} style={{ color: cfg.color }} />
          <span className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
          {isPending && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-yellow-500 text-[10px]">Processing</span>
            </span>
          )}
        </div>
        <span className="text-gray-600 text-xs">{timeAgo}</span>
      </div>

      <div className="p-4">
        {/* Amount */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Withdrawal Amount</p>
            <p className="text-white font-black text-2xl">{formatUGX(order.amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-0.5">You Receive</p>
            <p className="font-black text-xl" style={{ color: '#c9a84c' }}>{formatUGX(order.receivedAmount)}</p>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="rounded-xl p-3 mb-3" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>
          <p className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wider">Fee Breakdown</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Gross Amount</span>
              <span className="text-white">{formatUGX(order.amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Service Fee (16%)</span>
              <span className="text-red-400">-{formatUGX(order.fee)}</span>
            </div>
            <div className="h-px" style={{ background: '#333' }} />
            <div className="flex justify-between text-xs font-bold">
              <span className="text-gray-400">Net Received</span>
              <span style={{ color: '#c9a84c' }}>{formatUGX(order.receivedAmount)}</span>
            </div>
          </div>
        </div>

        {/* Bank Card */}
        <div className="rounded-xl p-3 mb-3" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={13} className="text-[#c9a84c]" />
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Destination</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">{order.bankCard?.bank || 'N/A'}</p>
              <p className="text-gray-500 text-xs">{order.bankCard?.accountNumber || 'N/A'}</p>
              <p className="text-gray-600 text-xs">{order.bankCard?.holderName || ''}</p>
            </div>
            <div className="w-10 h-6 rounded flex items-center justify-center text-[10px] font-bold"
              style={{ background: order.bankCard?.bank === 'MTN' ? '#ffcc00' : '#ef3a3a', color: order.bankCard?.bank === 'MTN' ? '#000' : '#fff' }}>
              {order.bankCard?.bank}
            </div>
          </div>
        </div>

        {/* Expected Arrival (pending only) */}
        {isPending && (
          <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-yellow-400" />
              <p className="text-yellow-400 text-xs font-semibold">Expected Arrival</p>
            </div>
            <p className="text-white font-bold text-sm mt-1">{getExpectedArrival(order.createdAt)}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">Funds credited within 4–24 hours of approval</p>
          </div>
        )}

        {/* Rejected notice */}
        {order.status === 'rejected' && (
          <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-xs font-semibold">Withdrawal Rejected</p>
              <p className="text-gray-500 text-[10px] mt-0.5">Your balance has been refunded. Please contact customer service if you have questions.</p>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-gray-700 text-[10px] mt-3 text-right">
          Submitted: {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function WithdrawStatusPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [orders, setOrders] = useState<WithdrawOrder[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  if (!currentUser) { navigate('/'); return null; }

  useEffect(() => {
    const raw = getWithdrawOrders(currentUser.id);
    setOrders(raw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [lastRefresh]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(() => setLastRefresh(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const pending = orders.filter(o => o.status === 'pending').length;
  const approved = orders.filter(o => o.status === 'completed').length;
  const rejected = orders.filter(o => o.status === 'rejected').length;
  const totalWithdrawn = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.receivedAmount, 0);

  const tabs = [
    { key: 'all' as const, label: 'All', count: orders.length },
    { key: 'pending' as const, label: 'Pending', count: pending },
    { key: 'completed' as const, label: 'Approved', count: approved },
    { key: 'rejected' as const, label: 'Rejected', count: rejected },
  ];

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Withdrawal Status</h1>
        <button onClick={() => setLastRefresh(Date.now())}
          className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <RefreshCw size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <div className="rounded-2xl p-4 col-span-2" style={{ background: 'linear-gradient(135deg, #1a1100, #2a1f00)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <p className="text-gray-500 text-xs mb-1">Total Successfully Withdrawn</p>
          <p className="text-[#c9a84c] font-black text-2xl">{formatUGX(totalWithdrawn)}</p>
        </div>
        {[
          { label: 'Pending', value: pending, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Approved', value: approved, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: item.bg, border: `1px solid ${item.color}30` }}>
            <p className="font-black text-2xl" style={{ color: item.color }}>{item.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            style={filter === t.key
              ? { background: 'linear-gradient(135deg, #c9a84c, #f0c040)', color: '#000' }
              : { background: '#1a1a1a', color: '#666', border: '1px solid #222' }}>
            {t.label}
            {t.count > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                style={filter === t.key ? { background: 'rgba(0,0,0,0.3)', color: '#000' } : { background: '#2a2a2a', color: '#888' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="px-4 pb-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center mt-2" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <CreditCard size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No withdrawal records</p>
            <p className="text-gray-700 text-xs mt-1">Your withdrawal requests will appear here</p>
            <button onClick={() => navigate('/withdraw')}
              className="mt-4 px-4 py-2.5 rounded-xl text-sm font-bold text-black gold-gradient">
              Make a Withdrawal
            </button>
          </div>
        ) : (
          filtered.map(order => <WithdrawCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
