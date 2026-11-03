import { useState, useEffect, useCallback } from 'react';
import { LogOut, Shield, CreditCard, ArrowDownCircle, Gift, Package, Users, Banknote, Play, Trophy, Megaphone, DollarSign } from 'lucide-react';
import { getAdminStats, processDailyIncome } from '@/lib/adminData';
import type { AdminStats } from '@/types/admin';
import { toast } from 'sonner';
import StatsOverview from '@/components/admin/StatsOverview';
import PaymentsTab from '@/components/admin/PaymentsTab';
import WithdrawalsTab from '@/components/admin/WithdrawalsTab';
import RedeemTab from '@/components/admin/RedeemTab';
import PackagesTab from '@/components/admin/PackagesTab';
import UsersTab from '@/components/admin/UsersTab';
import RechargesTab from '@/components/admin/RechargesTab';
import MissionsTab from '@/components/admin/MissionsTab';
import BroadcastTab from '@/components/admin/BroadcastTab';
import PesaJetTab from '@/components/admin/PesaJetTab';

type Tab = 'recharges' | 'payments' | 'withdrawals' | 'redeem' | 'packages' | 'users' | 'missions' | 'broadcast' | 'pesajet';

const EMPTY_STATS: AdminStats = {
  totalUsers: 0,
  totalActivePackages: 0,
  totalPendingPackages: 0,
  totalEarningsDistributed: 0,
  totalDeposits: 0,
  totalWithdrawals: 0,
  pendingWithdrawals: 0,
  totalReferralEarnings: 0,
};

export default function AdminPanel({ onLogout }: { onLogout: () => void }) {
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

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'pesajet', label: 'PesaJet', icon: DollarSign, badge: stats.totalPendingPackages },
    { key: 'recharges', label: 'Recharges', icon: Banknote, badge: stats.totalPendingPackages },
    { key: 'redeem', label: 'Redeem Code', icon: Gift },
    { key: 'payments', label: 'Packages', icon: CreditCard },
    { key: 'withdrawals', label: 'Withdrawals', icon: ArrowDownCircle, badge: stats.pendingWithdrawals },
    { key: 'packages', label: 'All Pkgs', icon: Package },
    { key: 'users', label: 'Users', icon: Users, badge: stats.totalUsers },
    { key: 'missions', label: 'Missions', icon: Trophy },
    { key: 'broadcast', label: 'Broadcast', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header - Gold & Black */}
      <div className="sticky top-0 z-50" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1100 100%)', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)', boxShadow: '0 0 20px rgba(201,168,76,0.3)' }}>
              <Shield className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-none">Admin Panel</h1>
              <p className="text-[#c9a84c] text-xs font-bold">Gold • PesaJet Active • Full Control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRunDailyIncome} disabled={runningIncome} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-black transition-all" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)', opacity: runningIncome ? 0.6 : 1 }}>
              <Play className={`w-4 h-4 ${runningIncome ? 'animate-pulse' : ''}`} />{runningIncome ? 'Running...' : 'Run Income'}
            </button>
            <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.replace('/'); }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: '#1a1a1a', border: '1px solid #333', color: '#888' }}>
              <LogOut className="w-4 h-4" /> Exit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Tabs - Gold & Black */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); refreshStats(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all relative ${activeTab === tab.key ? 'text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              style={activeTab === tab.key ? { background: 'linear-gradient(135deg, #c9a84c, #f0c040)', boxShadow: '0 4px 15px rgba(201,168,76,0.3)' } : { background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <tab.icon className="w-4 h-4" />{tab.label}
              {tab.badge !== undefined && tab.badge > 0 && <span className="ml-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">{tab.badge}</span>}
            </button>
          ))}
        </div>

        {/* Stats - 8 Cards - Gold & Black Theme */}
        <StatsOverview stats={stats} />

        {/* Content */}
        <div>
          {activeTab === 'pesajet' && <PesaJetTab />}
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
