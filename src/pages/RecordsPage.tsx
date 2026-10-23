import { useState, useEffect } from 'react';
import { ChevronLeft, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type Tab = 'all' | 'recharge' | 'withdraw' | 'income' | 'bonus' | 'referral';

const formatUGX = (n: number) => `UGX ${Number(n||0).toLocaleString()}`;

export default function RecordsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile);

      // Fetch from Supabase - all transactions + recharges + withdraws in one
      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Also include recharge and withdraw as transactions if you store separately
      const { data: recharges } = await supabase.from('recharge_orders').select('*').eq('user_id', user.id);
      const { data: withdraws } = await supabase.from('withdraw_orders').select('*').eq('user_id', user.id);

      // Merge everything into one list
      const merged = [
        ...(txs || []).map((t: any) => ({
          id: t.id,
          type: t.type, // income, bonus, referral, checkin, etc
          amount: Number(t.amount),
          description: t.description,
          status: t.status,
          createdAt: t.created_at
        })),
        ...(recharges || []).map((r: any) => ({
          id: `recharge-${r.id}`,
          type: 'recharge',
          amount: r.status === 'completed' ? Number(r.amount) : 0,
          description: `Recharge via ${r.payment_method || 'MTN'} - ${r.status}`,
          status: r.status,
          createdAt: r.created_at
        })),
        ...(withdraws || []).map((w: any) => ({
          id: `withdraw-${w.id}`,
          type: 'withdraw',
          amount: -Math.abs(Number(w.amount)),
          description: `Withdraw to ${w.bank || 'account'} - ${w.status}`,
          status: w.status,
          createdAt: w.created_at
        }))
      ].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTransactions(merged);
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading...</div>;
  if (!currentUser) { navigate('/'); return null; }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'recharge', label: 'Recharge' },
    { key: 'withdraw', label: 'Withdraw' },
    { key: 'income', label: 'Income' },
    { key: 'bonus', label: 'Bonus' },
    { key: 'referral', label: 'Referral' },
  ];

  let filtered = transactions;
  if (tab === 'recharge') filtered = filtered.filter(t => t.type === 'recharge' && t.amount > 0);
  else if (tab === 'withdraw') filtered = filtered.filter(t => t.type === 'withdraw');
  else if (tab === 'income') filtered = filtered.filter(t => t.type === 'income' || t.type === 'checkin');
  else if (tab === 'bonus') filtered = filtered.filter(t => t.type === 'bonus');
  else if (tab === 'referral') filtered = filtered.filter(t => t.type === 'referral');

  if (dateFrom) filtered = filtered.filter(t => new Date(t.createdAt) >= new Date(dateFrom));
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setDate(toDate.getDate() + 1);
    filtered = filtered.filter(t => new Date(t.createdAt) < toDate);
  }

  const getAmountColor = (type: string, amount: number) => {
    if (['income', 'bonus', 'checkin', 'referral'].includes(type)) return '#c9a84c';
    if (amount < 0 || type === 'withdraw') return '#ef4444';
    return '#60a5fa';
  };

  const getTypeIcon = (type: string) => {
    if (type === 'recharge') return '📥';
    if (type === 'withdraw') return '📤';
    if (type === 'income') return '💰';
    if (type === 'checkin') return '✅';
    if (type === 'bonus') return '🎁';
    if (type === 'referral') return '👥';
    return '💸';
  };

  const getStatusStyle = (status: string) => {
    if (status === 'completed') return { background: 'rgba(201,168,76,0.1)', color: '#c9a84c' };
    if (status === 'pending') return { background: 'rgba(251,191,36,0.1)', color: '#fbbf24' };
    return { background: 'rgba(239,68,68,0.1)', color: '#ef4444' };
  };

  const totalIn = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Records</h1>
        <button onClick={() => setShowFilters(!showFilters)}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: showFilters ? 'linear-gradient(135deg, #c9a84c, #f0c040)' : '#1e1e1e' }}>
          <Filter size={14} className={showFilters ? 'text-black' : 'text-gray-400'} />
        </button>
      </div>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ borderBottom: '1px solid #1a1a1a' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold"
            style={tab === t.key ? { background: 'linear-gradient(135deg, #c9a84c, #f0c040)', color: '#000' } : { background: '#1a1a1a', color: '#666', border: '1px solid #222' }}>
            {t.label}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="px-4 py-3" style={{ background: '#111111', borderBottom: '1px solid #1a1a1a' }}>
          <p className="text-gray-500 text-xs mb-2">Filter by date range</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none" style={{ background: '#1e1e1e', border: '1px solid #333' }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none" style={{ background: '#1e1e1e', border: '1px solid #333' }} />
          </div>
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="mt-2 text-xs text-[#c9a84c] underline">Clear dates</button>}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4 py-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <div className="rounded-xl p-2 text-center" style={{ background: '#151515' }}><p className="text-white font-black text-sm">{filtered.length}</p><p className="text-gray-600 text-[10px]">Records</p></div>
          <div className="rounded-xl p-2 text-center" style={{ background: '#151515' }}><p className="text-[#c9a84c] font-black text-xs">+{formatUGX(totalIn)}</p><p className="text-gray-600 text-[10px]">In</p></div>
          <div className="rounded-xl p-2 text-center" style={{ background: '#151515' }}><p className="text-red-400 font-black text-xs">-{formatUGX(totalOut)}</p><p className="text-gray-600 text-[10px]">Out</p></div>
        </div>
      )}

      <div className="px-4 mt-3 space-y-2 pb-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-10 text-center mt-4" style={{ background: '#151515' }}><p className="text-gray-600 text-sm">No records</p></div>
        ) : (
          filtered.map(tx => (
            <div key={tx.id} className="rounded-2xl px-4 py-3.5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: '#1e1e1e' }}>{getTypeIcon(tx.type)}</div>
                  <div><p className="text-gray-300 text-sm font-medium">{tx.description}</p><p className="text-gray-600 text-xs mt-0.5">{new Date(tx.createdAt).toLocaleString()}</p></div>
                </div>
                <div className="text-right ml-2">
                  <p className="font-bold text-sm" style={{ color: getAmountColor(tx.type, tx.amount) }}>{tx.amount >= 0 ? '+' : ''}{formatUGX(tx.amount)}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={getStatusStyle(tx.status)}>{tx.status}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}