import { useState, useEffect, useCallback } from 'react';
import { LogOut, Shield, CreditCard, ArrowDownCircle, Gift, Package, Users, Banknote, Play, Trophy, Megaphone, DollarSign, Clock, Wallet, BarChart3, TrendingUp } from 'lucide-react';
import { adminLogout, getAdminStats, processDailyIncome, getRechargeRequests, approveRecharge, rejectRecharge } from '@/lib/adminData';
import type { AdminStats } from '@/types/admin';
import { toast } from 'sonner';
import PaymentsTab from '@/components/admin/PaymentsTab';
import WithdrawalsTab from '@/components/admin/WithdrawalsTab';
import RedeemTab from '@/components/admin/RedeemTab';
import PackagesTab from '@/components/admin/PackagesTab';
import UsersTab from '@/components/admin/UsersTab';
import RechargesTab from '@/components/admin/RechargesTab';
import MissionsTab from '@/components/admin/MissionsTab';
import BroadcastTab from '@/components/admin/BroadcastTab';
import { formatUGX } from '@/lib/storage';

type Tab = 'recharges' | 'payments' | 'withdrawals' | 'redeem' | 'packages' | 'users' | 'missions' | 'broadcast' | 'pesajet';

interface Props { onLogout: () => void; }

const EMPTY_STATS: AdminStats = {
  totalUsers: 0, totalActivePackages: 0, totalPendingPackages: 0,
  totalEarningsDistributed: 0, totalDeposits: 0, totalWithdrawals: 0,
  pendingWithdrawals: 0, totalReferralEarnings: 0,
};

// ===== STATS OVERVIEW - BLACK & GOLD - 8 CARDS =====
function StatsOverview({ stats }: { stats: AdminStats }) {
  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#c9a84c' },
    { label: 'Active Packages 📦', value: stats.totalActivePackages, icon: Package, color: '#34d399' },
    { label: 'Pending Packages', value: stats.totalPendingPackages, icon: Clock, color: '#fbbf24' },
    { label: 'Total Deposits', value: `${Number(stats.totalDeposits).toLocaleString()} UGX`, icon: Banknote, color: '#c084fc' },
    { label: 'Total Withdrawals', value: `${Number(stats.totalWithdrawals).toLocaleString()} UGX`, icon: ArrowDownCircle, color: '#f87171' },
    { label: 'Pending Payouts', value: `${stats.pendingWithdrawals} pending`, icon: Wallet, color: '#fb923c' },
    { label: 'Earnings Distributed', value: `${Number(stats.totalEarningsDistributed).toLocaleString()} UGX`, icon: BarChart3, color: '#2dd4bf' },
    { label: 'Total Referral', value: `${Number(stats.totalReferralEarnings).toLocaleString()} UGX`, icon: Gift, color: '#f472b6' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {cards.map(c => (
        <div key={c.label} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.15)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
            <c.icon size={16} className="text-black" />
          </div>
          <p className="text-gray-500 text-[11px]">{c.label}</p>
          <p className="font-black text-[13px] mt-1" style={{ color: c.color }}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ===== PESAJET TAB - USES RECHARGE (SAME TABLE) - BLACK & GOLD =====
function PesaJetTab({ onRefresh }: { onRefresh: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getRechargeRequests('pending'); // Uses RECHARGE table - investment_packages where product_name=RECHARGE status=pending
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = orders.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.4)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
            <span className="text-black font-black text-xs">PesaJet</span>
          </div>
          <div>
            <p className="text-white font-black text-sm">PesaJet Pay - Uses Recharge Table</p>
            <p className="text-[#c9a84c] text-[11px]">MTN 0756406186 (Nabakooza Milly) • investment_packages RECHARGE</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.5)' }}><p className="text-[#c9a84c] font-black">{orders.length}</p><p className="text-gray-500 text-[10px]">Pending PesaJet</p></div>
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.5)' }}><p className="text-white font-black text-xs">{formatUGX(total)}</p><p className="text-gray-500 text-[10px]">Total UGX</p></div>
          <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(0,0,0,0.5)' }}><p className="text-green-400 font-black text-xs">MTN • Airtel</p><p className="text-gray-500 text-[10px]">Uganda</p></div>
        </div>
      </div>

      <button onClick={load} className="w-full py-3 rounded-xl font-black text-black text-sm" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
        {loading ? '⏳ Checking Recharge...' : `🔄 Refresh PesaJet (${orders.length}) - From Recharge`}
      </button>

      {orders.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#111111', border: '1px dashed rgba(201,168,76,0.2)' }}>
          <p className="text-gray-400 text-sm">No pending PesaJet payments</p>
          <p className="text-gray-600 text-xs">Pending recharges (RECHARGE table) appear here</p>
        </div>
      ) : orders.map((o: any) => (
        <div key={o.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.35)' }}>
          <div className="flex justify-between mb-2">
            <div><p className="text-white font-black">{formatUGX(o.amount)} - {o.payment_method || 'MTN'}</p><p className="text-gray-400 text-xs">{o.user_phone} • {o.user_email}</p></div>
            <span className="text-[10px] px-2 py-1 rounded-full h-fit" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>PENDING</span>
          </div>
          <div className="rounded-xl p-3 mb-3" style={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }}>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Your MTN</span><span className="text-white font-bold">0756406186 (Nabakooza Milly)</span></div>
            <p className="text-[#c9a84c] text-[10px] mt-2">Dial *185*1# → Verify UGX {o.amount} from {o.user_phone}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={async () => { if (confirm(`Confirm ${formatUGX(o.amount)} from ${o.user_phone}?`)) { await approveRecharge(o.id); toast.success('PesaJet Confirmed!'); load(); onRefresh(); } }} className="py-3 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>💰 Manual Confirm</button>
            <button onClick={async () => { if (confirm('Reject?')) { await rejectRecharge(o.id); toast.success('Rejected'); load(); onRefresh(); } }} className="py-3 rounded-xl text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPanel({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pesajet');
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [runningIncome, setRunningIncome] = useState(false);

  const handleRunDailyIncome = async () => {
    setRunningIncome(true);
    const result = await processDailyIncome();
    if (result.error) toast.error('Error: ' + result.error);
    else { toast.success(`✅ ${result.message}`); refreshStats(); }
    setRunningIncome(false);
  };

  const refreshStats = useCallback(async () => {
    const s = await getAdminStats();
    setStats(s);
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const handleLogout = () => { adminLogout(); onLogout(); };

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'pesajet', label: 'PesaJet', icon: DollarSign, badge: stats.totalPendingPackages },
    { key: 'redeem', label: 'Create Redeem Code', icon: Gift },
    { key: 'recharges', label: 'Recharges', icon: Banknote, badge: stats.totalPendingPackages },
    { key: 'payments', label: 'Packages', icon: CreditCard },
    { key: 'withdrawals', label: 'Withdrawals', icon: ArrowDownCircle, badge: stats.pendingWithdrawals },
    { key: 'packages', label: 'All Pkgs', icon: Package },
    { key: 'users', label: 'Users', icon: Users, badge: stats.totalUsers },
    { key: 'missions', label: 'Missions', icon: Trophy },
    { key: 'broadcast', label: 'Broadcast', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      {/* Header - BLACK & GOLD */}
      <div className="sticky top-0 z-50" style={{ background: 'linear-gradient(135deg, #000000 0%, #1a1100 100%)', borderBottom: '1px solid rgba(201,168,76,0.25)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)', boxShadow: '0 0 20px rgba(201,168,76,0.4)' }}>
              <Shield className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-none">Admin Panel</h1>
              <p className="text-[#c9a84c] text-xs font-bold">GOLD • PESAJET • Uses Recharge</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRunDailyIncome} disabled={runningIncome} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)', opacity: runningIncome ? 0.6 : 1 }}>
              <Play className={`w-4 h-4 ${runningIncome ? 'animate-pulse' : ''}`} />{runningIncome ? 'Running...' : 'Run Income'}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: '#111111', border: '1px solid #2a2a2a', color: '#888' }}>
              <LogOut className="w-4 h-4" />Exit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Tabs - BLACK & GOLD */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); refreshStats(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap relative ${activeTab === tab.key ? 'text-black shadow-lg' : 'text-gray-500'}`}
              style={activeTab === tab.key ? { background: 'linear-gradient(135deg, #c9a84c, #f0c040)', boxShadow: '0 4px 20px rgba(201,168,76,0.4)' } : { background: '#111111', border: '1px solid #2a2a2a' }}>
              <tab.icon className="w-4 h-4" />{tab.label}
              {tab.badge !== undefined && tab.badge > 0 && <span className="ml-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">{tab.badge}</span>}
            </button>
          ))}
        </div>

        <StatsOverview stats={stats} />

        <div>
          {activeTab === 'pesajet' && <PesaJetTab onRefresh={refreshStats} />}
          {activeTab === 'recharges' && <RechargesTab />}
          {activeTab === 'payments' && <PaymentsTab />}
          {activeTab === 'withdrawals' && <WithdrawalsTab />}
          {activeTab === 'redeem' && <RedeemTab />}
          {activeTab === 'packages' && <PackagesTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'missions' && <MissionsTab />}
          {activeTab === 'broadcast' && <BroadcastTab />}
        </div>
      </div>
    </div>
  );
          }
