import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  BarChart3,
  Clock,
  CreditCard,
  DollarSign,
  Gift,
  LogOut,
  Package,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  approvePasswordReset,
  createGiftCode,
  deleteGiftCode,
  formatUGX,
  getGiftCodes,
  getPasswordResets,
  rejectPasswordReset,
  setCurrentUser,
} from '@/lib/storage';
import type { PasswordResetRequest } from '@/lib/storage';
import { PRODUCTS } from '@/constants/products';

type AdminTab = 'pesajet' | 'overview' | 'users' | 'referrals' | 'recharge' | 'withdraw' | 'products' | 'gifts' | 'resets';

type AdminUser = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  phone: string;
  balance: number;
  wallet_balance?: number;
  cumulativeIncome: number;
  level: number;
  referralCode: string;
  referredBy?: string | null;
  createdAt?: string;
  isAdmin?: boolean;
  source: 'SUPABASE';
  isBlocked?: boolean;
};

type RechargeOrder = {
  id: string;
  user_id?: string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  phone_number?: string | null;
  product_name?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  pesajet_id?: string | null;
};

const tabs: { key: AdminTab; label: string; icon: typeof Users }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'pesajet', label: 'PesaJet', icon: DollarSign },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'referrals', label: 'Referrals', icon: UserCheck },
  { key: 'recharge', label: 'Recharge', icon: CreditCard },
  { key: 'withdraw', label: 'Withdraw', icon: ArrowDownToLine },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'gifts', label: 'Redeem Code', icon: Gift },
  { key: 'resets', label: 'Resets', icon: Shield },
];

function getRechargeStatusStyle(statusValue: string | null | undefined) {
  const status = String(statusValue || 'unknown').toLowerCase();
  if (['completed', 'approved', 'paid', 'successful'].includes(status)) {
    return { label: 'COMPLETED', color: '#4ade80', background: 'rgba(74,222,128,0.12)' };
  }
  if (status === 'pending') {
    return { label: 'PENDING', color: '#fbbf24', background: 'rgba(251,191,36,0.12)' };
  }
  return { label: status.toUpperCase(), color: '#f87171', background: 'rgba(248,113,113,0.12)' };
}

function getGeneralStatusStyle(statusValue: string | null | undefined) {
  const status = String(statusValue || '').toLowerCase();
  if (['completed', 'approved', 'active'].includes(status)) {
    return { background: 'rgba(74,222,128,0.12)', color: '#4ade80' };
  }
  if (status === 'pending') {
    return { background: 'rgba(251,191,36,0.12)', color: '#fbbf24' };
  }
  return { background: 'rgba(248,113,113,0.12)', color: '#f87171' };
}

function formatDate(value?: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

function PesaJetTab({ orders, loading, loadError, onRefresh }: { orders: RechargeOrder[]; loading: boolean; loadError: string; onRefresh: () => void }) {
  const pendingCount = orders.filter((order) => String(order.status).toLowerCase() === 'pending').length;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.4)' }}>
        <p className="text-white font-black text-sm">PesaJet Recharge Monitor</p>
        <p className="text-[#c9a84c] text-[11px] mt-1">{pendingCount} pending • {orders.length} total recharge records</p>
        <p className="text-gray-400 text-[11px] mt-1">Payment status and wallet credit are handled by the verified server callback.</p>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading} className="w-full py-3 rounded-xl font-black text-black text-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
        {loading ? 'Checking…' : 'Refresh PesaJet records'}
      </button>
      {loadError && <div className="rounded-xl p-3 text-sm text-red-300 bg-red-950/30">{loadError}</div>}
      {!loadError && !loading && orders.length === 0 && (
        <div className="rounded-2xl p-10 text-center" style={{ background: '#111', border: '1px dashed #333' }}>
          <p className="text-gray-400 text-sm">No recharge records found.</p>
        </div>
      )}
      {orders.map((order) => {
        const status = getRechargeStatusStyle(order.status);
        return (
          <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.3)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-black">{formatUGX(Number(order.amount || 0))}</p>
                <p className="text-gray-400 text-xs mt-1">{order.payment_method || 'PesaJet'} • {order.phone_number || 'No phone'}</p>
                <p className="text-gray-500 text-[10px] mt-1">User: {String(order.user_id || '—').slice(0, 12)}</p>
                <p className="text-gray-500 text-[10px] mt-1 break-all">Reference: {order.id}</p>
                {order.pesajet_id && <p className="text-gray-500 text-[10px] mt-1 break-all">Provider transaction: {order.pesajet_id}</p>}
              </div>
              <span className="shrink-0 px-2 py-1 rounded-full text-[10px] font-black" style={{ color: status.color, background: status.background }}>{status.label}</span>
            </div>
            <p className="text-gray-600 text-[10px] mt-3">{formatDate(order.submitted_at || order.created_at)}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('users');
  const [searchQ, setSearchQ] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [supaUsers, setSupaUsers] = useState<AdminUser[]>([]);
  const [rechargeOrders, setRechargeOrders] = useState<RechargeOrder[]>([]);
  const [supaWithdraw, setSupaWithdraw] = useState<any[]>([]);
  const [supaProducts, setSupaProducts] = useState<any[]>([]);
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [openTeam, setOpenTeam] = useState<Record<string, boolean>>({});

  // --- FIXED: Adjust Modal state ---
  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null);
  const [adjustType, setAdjustType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const loadAllFromSupabase = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const [usersResult, rechargeResult, withdrawalsResult, productsResult, referralsResult] = await Promise.all([
      supabase.from('platform_users').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('investment_packages').select('*').eq('product_name', 'RECHARGE').order('submitted_at', { ascending: false }).limit(500),
      supabase.from('withdraw_orders').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('user_products').select('*').order('purchase_date', { ascending: false }).limit(500),
      supabase.rpc('get_admin_referrals'),
    ]);

    if (usersResult.error) console.error('Admin users load failed:', usersResult.error.message);
    if (rechargeResult.error) {
      console.error('Admin recharge load failed:', rechargeResult.error.message);
      setLoadError('Could not load recharge records. Check the investment_packages table and Supabase RLS policies.');
    } else {
      setRechargeOrders((rechargeResult.data || []) as RechargeOrder[]);
    }
    if (withdrawalsResult.error) console.error('Admin withdrawals load failed:', withdrawalsResult.error.message);
    else setSupaWithdraw(withdrawalsResult.data || []);
    if (productsResult.error) console.error('Admin products load failed:', productsResult.error.message);
    else setSupaProducts(productsResult.data || []);
    if (referralsResult.error) console.error('Admin referrals load failed:', referralsResult.error.message);
    else setAllReferrals(referralsResult.data || []);

    const databaseUsers: AdminUser[] = (usersResult.data || []).map((user: any) => ({
      id: String(user.id),
      name: String(user.name || user.full_name || ''),
      full_name: String(user.full_name || user.name || ''),
      phone: String(user.phone || user.phone_number || user.mobile || ''),
      balance: Number(user.wallet_balance ?? user.balance ?? 0),
      wallet_balance: Number(user.wallet_balance ?? user.balance ?? 0),
      cumulativeIncome: Number(user.cumulative_income ?? user.total_earnings ?? 0),
      level: Number(user.level || 1),
      referralCode: String(user.referral_code || user.own_referral_code || String(user.id).slice(0, 6).toUpperCase()),
      referredBy: user.referred_by ?? user.referrer_id ?? user.invited_by ?? user.referrer_code ?? null,
      createdAt: user.created_at || undefined,
      source: 'SUPABASE',
      isBlocked: Boolean(user.is_blocked || user.is_banned),
    }));

    setSupaUsers(databaseUsers);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAllFromSupabase();
    const timer = setInterval(() => { void loadAllFromSupabase(); }, 15000);
    return () => clearInterval(timer);
  }, [loadAllFromSupabase, refresh]);

  const users = supaUsers;

  const withdrawOrders = supaWithdraw.map((order: any) => ({
    id: String(order.id),
    userId: String(order.user_id || ''),
    amount: Number(order.amount || 0),
    phoneNumber: String(order.phone_number || ''),
    status: String(order.status || 'pending'),
    createdAt: order.created_at,
    source: 'SUPABASE',
  }));

  const allUserProducts = supaProducts.map((product: any) => ({
    ...product,
    userId: String(product.user_id || ''),
    productId: product.product_id,
    product_id: product.product_id,
    productName: product.product_name,
    price: product.price,
    dailyIncome: product.daily_income,
    purchaseDate: product.purchase_date,
    status: product.status,
    source: 'SUPABASE',
  }));

  const pendingRechargeCount = rechargeOrders.filter((order) => String(order.status).toLowerCase() === 'pending').length;
  const pendingWithdrawals = withdrawOrders.filter((order) => String(order.status).toLowerCase() === 'pending');
  const completedRechargeOrders = rechargeOrders.filter((order) => ['completed', 'approved', 'paid', 'successful'].includes(String(order.status).toLowerCase()));
  const totalUsers = users.length;
  const activeProductsCount = allUserProducts.filter((product) => String(product.status).toLowerCase() === 'active').length;
  const pendingPackages = pendingRechargeCount;
  const totalDeposits = completedRechargeOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const totalWithdrawals = withdrawOrders.filter((order) => ['completed', 'approved'].includes(String(order.status).toLowerCase())).reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const pendingPayouts = pendingWithdrawals.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const earningsDistributed = users.reduce((sum, user) => sum + Number(user.cumulativeIncome || 0), 0);
  const referralEarnings = earningsDistributed;

  const passwordResets = getPasswordResets();
  const pendingResetCount = passwordResets.filter((request) => request.status === 'pending').length;

  const tabBadges: Partial<Record<AdminTab, number>> = {
    pesajet: pendingRechargeCount,
    users: users.length,
    referrals: allReferrals.length,
    recharge: pendingRechargeCount,
    withdraw: pendingWithdrawals.length,
    products: activeProductsCount,
    resets: pendingResetCount,
  };

  const handleLogout = () => { setCurrentUser(null); navigate('/login'); };

  // FIXED: Open modal instead of window.prompt
  const handleAdjust = (user: AdminUser) => {
    setAdjustUser(user);
    setAdjustType('ADD');
    setAdjustAmount('');
  };

  // FIXED: Confirm button in modal - runs the SQL
  const confirmAdjust = async () => {
    if (!adjustUser) return;
    const amount = Number.parseInt(adjustAmount.replace(/\D/g, ''), 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) { toast.error('Enter a valid amount.'); return; }
    setAdjusting(true);
    const { error: rpcError } = await supabase.rpc('admin_adjust_balance', {
      p_user_id: adjustUser.id,
      p_amount: amount,
      p_type: adjustType,
      p_reason: 'Admin adjust',
    });
    if (rpcError) {
      // Fallback if you haven't run the SQL yet
      const newBalance = adjustType === 'DEDUCT' ? Math.max(0, adjustUser.balance - amount) : adjustUser.balance + amount;
      const { error } = await supabase.from('platform_users').update({ wallet_balance: newBalance }).eq('id', adjustUser.id);
      if (error) { toast.error('Could not adjust balance.'); setAdjusting(false); return; }
    }
    toast.success(`${adjustType === 'DEDUCT' ? 'Deducted' : 'Added'} ${formatUGX(amount)} for ${adjustUser.phone}.`);
    setAdjusting(false);
    setAdjustUser(null);
    setAdjustAmount('');
    setRefresh((v) => v + 1);
  };

  const handleBlockUser = async (user: AdminUser) => {
    const shouldBlock = !user.isBlocked;
    if (!window.confirm(`${shouldBlock ? 'Ban' : 'Unban'} ${user.phone}?`)) return;
    const { error } = await supabase.from('platform_users').update({ is_blocked: shouldBlock, is_banned: shouldBlock }).eq('id', user.id);
    if (error) { toast.error('Could not update user status.'); return; }
    toast.success(shouldBlock ? 'User banned.' : 'User unbanned.');
    setRefresh((value) => value + 1);
  };

  const handleWithdrawalDecision = async (order: (typeof withdrawOrders)[number], decision: 'approve' | 'reject') => {
    const nextStatus = decision === 'approve' ? 'approved' : 'rejected';
    const { error } = await supabase.from('withdraw_orders').update({ status: nextStatus }).eq('id', order.id).eq('status', 'pending');
    if (error) { toast.error('Could not update withdrawal.'); return; }
    toast.success(decision === 'approve' ? 'Withdrawal approved.' : 'Withdrawal rejected.');
    setRefresh((value) => value + 1);
  };

  const handleCreateGiftCode = () => {
    const amount = Number.parseInt(window.prompt('Gift code amount in UGX:') || '', 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) { toast.error('Enter a valid positive amount.'); return; }
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    try {
      createGiftCode(amount, undefined, expiresAt);
      toast.success('Redeem code created.');
      setRefresh((value) => value + 1);
    } catch (error) {
      console.error('Could not create gift code:', error);
      toast.error('Could not create redeem code.');
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = searchQ.toLowerCase();
    return !q || user.phone.toLowerCase().includes(q) || (user.name || '').toLowerCase().includes(q) || (user.full_name || '').toLowerCase().includes(q) || user.referralCode.toLowerCase().includes(q);
  });

  const groupedReferrals: Record<string, any> = {};
  allReferrals.forEach((r: any) => {
    if (!groupedReferrals[r.inviter_phone]) groupedReferrals[r.inviter_phone] = { inviter_name: r.inviter_name, inviter_phone: r.inviter_phone, inviter_code: r.inviter_code, members: [] };
    groupedReferrals[r.inviter_phone].members.push(r);
  });
  const filteredReferralGroups = Object.values(groupedReferrals).filter((g: any) =>
    !searchQ || g.inviter_phone?.includes(searchQ) || g.inviter_name?.toLowerCase().includes(searchQ.toLowerCase()) || g.inviter_code?.toLowerCase().includes(searchQ.toLowerCase()) || g.members.some((m: any) => m.new_user_phone?.includes(searchQ) || m.new_user_name?.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const quickAmounts = [5000, 10000, 20000, 50000, 100000];
  const parsedAdjustAmount = Number.parseInt(adjustAmount.replace(/\D/g, ''), 10) || 0;

  return (
    <div className="min-h-screen bg-black">
      <header className="flex items-center justify-between p-4" style={{ background: 'linear-gradient(135deg, #000000, #1a1100)', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
            <Shield size={18} className="text-black" />
          </div>
          <span className="text-white font-black">Admin Panel</span>
          <span className="hidden sm:inline text-[9px] font-black text-black px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
            {totalUsers} USERS • {activeProductsCount} ACTIVE
          </span>
        </div>
        <button type="button" onClick={handleLogout} aria-label="Log out" className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#111', border: '1px solid #2a2a2a' }}>
          <LogOut size={15} className="text-gray-400" />
        </button>
      </header>

      <nav className="flex overflow-x-auto" style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
        {tabs.map((item) => {
          const Icon = item.icon;
          const badge = tabBadges[item.key] || 0;
          return (
            <button type="button" key={item.key} onClick={() => setTab(item.key)} className="relative flex flex-shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-bold" style={tab === item.key ? { color: '#c9a84c', borderBottom: '2px solid #c9a84c' } : { color: '#777' }}>
              <Icon size={13} />
              {item.label}
              {badge > 0 && (
                <span className="absolute top-1 right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <main className="p-4 pb-20">
        {(loading || loadError) && (
          <div className="mb-3 text-xs">
            {loading && <p className="text-gray-500">Refreshing admin data…</p>}
            {loadError && <p className="text-red-300">{loadError}</p>}
          </div>
        )}

        {tab === 'overview' && (
          <div className="space-y-3">
            <button type="button" onClick={() => setRefresh((value) => value + 1)} className="w-full py-2 rounded-xl text-xs text-[#c9a84c]" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
              Refresh all devices • {totalUsers} users • {pendingRechargeCount} pending recharges
            </button>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Users size={20} className="text-white" />} iconBg="#2563eb" label="Total Users" value={String(totalUsers)} valueColor="#60a5fa" />
              <StatCard icon={<Package size={20} className="text-white" />} iconBg="#16a34a" label="Active Products" value={String(activeProductsCount)} valueColor="#4ade80" />
              <StatCard icon={<Clock size={20} className="text-white" />} iconBg="#d97706" label="Pending Recharges" value={String(pendingPackages)} valueColor="#fb923c" />
              <StatCard icon={<TrendingUp size={20} className="text-white" />} iconBg="#7c3aed" label="Completed Deposits" value={formatUGX(totalDeposits)} valueColor="#c084fc" />
              <StatCard icon={<ArrowDownToLine size={20} className="text-white" />} iconBg="#dc2626" label="Total Withdrawals" value={formatUGX(totalWithdrawals)} valueColor="#f87171" />
              <StatCard icon={<Wallet size={20} className="text-white" />} iconBg="#ea580c" label="Pending Payouts" value={formatUGX(pendingPayouts)} valueColor="#fb923c" />
              <StatCard icon={<TrendingUp size={20} className="text-white" />} iconBg="#0d9488" label="Earnings Distributed" value={formatUGX(earningsDistributed)} valueColor="#2dd4bf" />
              <StatCard icon={<UserCheck size={20} className="text-white" />} iconBg="#db2777" label="Referral Earnings" value={formatUGX(referralEarnings)} valueColor="#f472b6" />
            </div>
          </div>
        )}

        {tab === 'pesajet' && <PesaJetTab orders={rechargeOrders} loading={loading} loadError={loadError} onRefresh={() => void loadAllFromSupabase()} />}

        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black text-xl">All Users ({users.length})</h2>
              <button type="button" onClick={() => setRefresh((v) => v + 1)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-blue-400" style={{ background: '#0f172a', border: '1px solid #1e40af' }}>
                <Clock size={14} /> Refresh
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3.5" style={{ background: '#111827', border: '1px solid #1f2937' }}>
              <Search size={18} className="text-gray-500" />
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search by name or phone..." className="flex-1 bg-transparent outline-none text-white placeholder-gray-500" />
            </div>

            {filteredUsers.map((user) => {
              const userWithdrawals = withdrawOrders.filter((o) => o.userId === user.id || (o.phoneNumber && o.phoneNumber.replace(/\D/g, '').slice(-9) === user.phone.replace(/\D/g, '').slice(-9)));
              const withdrawnAmount = userWithdrawals.filter((o) => ['completed', 'approved'].includes(String(o.status).toLowerCase())).reduce((s, o) => s + Number(o.amount || 0), 0);
              const userProducts = allUserProducts.filter((p) => p.userId === user.id);
              const activeUserProducts = userProducts.filter((p) => String(p.status).toLowerCase() === 'active').length;
              const level1 = users.filter((u) => String(u.referredBy || '') === String(user.id) || String(u.referredBy || '') === String(user.referralCode));
              const level1Ids = new Set(level1.map((u) => u.id));
              const level2 = users.filter((u) => level1Ids.has(String(u.referredBy || '')));
              const level2Ids = new Set(level2.map((u) => u.id));
              const level3 = users.filter((u) => level2Ids.has(String(u.referredBy || '')));
              const team = [...level1, ...level2, ...level3];
              const displayName = user.name || user.full_name || user.phone;
              const isTeamOpen = !!openTeam[user.id];
              return (
                <section key={user.id} className="rounded-3xl p-5" style={{ background: '#111827', border: '1px solid #1f2937' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-black text-xl leading-tight">{displayName}</p>
                      <p className="text-gray-400 text-base mt-0.5">{user.phone}</p>
                      <p className="text-gray-500 text-sm mt-0.5">Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US') : 'Unknown'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-green-400 font-black text-lg">{formatUGX(user.balance)}</p>
                      <p className="text-gray-500 text-sm">Balance</p>
                      {user.isBlocked && <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400">BANNED</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div className="rounded-xl p-3 text-center" style={{ background: '#1f2937' }}>
                      <p className="text-blue-400 font-black text-sm leading-tight">{formatUGX(user.cumulativeIncome)}</p>
                      <p className="text-gray-400 text-xs mt-1 leading-tight">Total<br />Earned</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#1f2937' }}>
                      <p className="text-orange-400 font-black text-sm leading-tight">{formatUGX(withdrawnAmount)}</p>
                      <p className="text-gray-400 text-xs mt-1 leading-tight">Withdrawn</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#1f2937' }}>
                      <p className="text-green-400 font-black text-sm leading-tight">{activeUserProducts}</p>
                      <p className="text-gray-400 text-xs mt-1 leading-tight">Active<br />Pkgs</p>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#1f2937' }}>
                      <p className="text-purple-400 font-black text-sm leading-tight">{team.length}</p>
                      <p className="text-gray-400 text-xs mt-1 leading-tight">Referrals</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mt-4">Referral Code: <span className="text-blue-400 font-medium">{user.referralCode}</span></p>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <button type="button" onClick={() => setOpenTeam({ ...openTeam, [user.id]: !isTeamOpen })} className="py-3 rounded-xl text-sm font-bold text-blue-400 flex items-center justify-center gap-1.5" style={{ background: '#1e3a8a' }}>
                      <Users size={15} /> {isTeamOpen ? 'Hide Team' : 'View Team'}
                    </button>
                    <button type="button" onClick={() => handleAdjust(user)} className="py-3 rounded-xl text-sm font-bold text-yellow-300 flex items-center justify-center gap-1.5" style={{ background: '#3a2f00', border: '1px solid #665500' }}>
                      <Wallet size={15} /> Adjust
                    </button>
                    <button type="button" onClick={() => void handleBlockUser(user)} className="py-3 rounded-xl text-sm font-bold text-red-400 flex items-center justify-center gap-1.5" style={{ background: '#4a1a1a' }}>
                      <Shield size={15} /> {user.isBlocked ? 'Unban' : 'Ban'}
                    </button>
                  </div>
                  {isTeamOpen && (
                    <div className="mt-4 space-y-2" style={{ borderTop: '1px solid #1f2937', paddingTop: 12 }}>
                      <p className="text-gray-400 text-xs">L1: {level1.length} • L2: {level2.length} • L3: {level3.length}</p>
                      {team.length === 0 && <p className="text-gray-500 text-sm text-center py-2">No team members yet</p>}
                      {team.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#1f2937' }}>
                          <div>
                            <p className="text-white text-sm font-medium">{m.name || m.full_name || m.phone}</p>
                            <p className="text-gray-500 text-xs">{m.phone} • {m.referralCode}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">{level1.some((x) => x.id === m.id) ? 'L1' : level2.some((x) => x.id === m.id) ? 'L2' : 'L3'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="rounded-2xl p-10 text-center" style={{ background: '#111', border: '1px dashed #333' }}>
                <p className="text-gray-400 text-sm">No matching users found.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'referrals' && (
          <div className="space-y-3">
            <button type="button" onClick={() => setRefresh((value) => value + 1)} className="w-full py-2.5 rounded-xl font-black text-black text-xs" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
              Refresh referrals ({allReferrals.length} invited)
            </button>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#111', border: '1px solid #2a2a2a' }}>
              <Search size={14} className="text-gray-500" />
              <input value={searchQ} onChange={(event) => setSearchQ(event.target.value)} placeholder="Search inviter or invited phone / name" className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600" />
            </div>
            <div className="rounded-2xl p-4 text-center" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p className="text-white font-black">{allReferrals.length} total invited • {filteredReferralGroups.length} inviters</p>
              <p className="text-gray-500 text-xs mt-1">Everyone who registered by using everyone's link</p>
            </div>
            {filteredReferralGroups.map((g: any) => (
              <section key={g.inviter_phone} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.3)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-black shrink-0" style={{ background: 'linear-gradient(135deg,#c9a84c,#f0c040)' }}>{g.inviter_name?.[0] || '?'}</div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{g.inviter_name || 'Unknown'}</p>
                      <p className="text-gray-500 text-xs">{g.inviter_phone} • {g.inviter_code}</p>
                    </div>
                  </div>
                  <span className="text-[#c9a84c] font-black text-sm shrink-0 ml-2">{g.members.length} invited</span>
                </div>
                <div className="space-y-2">
                  {g.members.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#1e1e1e', border: '1px solid #333' }}>
                      <div>
                        <p className="text-white text-sm font-medium">{m.new_user_name || m.new_user_phone}</p>
                        <p className="text-gray-500 text-xs">{m.new_user_phone} • {m.new_user_code}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: m.level === 1 ? 'rgba(201,168,76,0.2)' : 'rgba(34,197,94,0.2)', color: m.level === 1 ? '#c9a84c' : '#22c55e' }}>L{m.level}</span>
                        <p className="text-gray-500 text-xs mt-1">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {filteredReferralGroups.length === 0 && (
              <div className="rounded-2xl p-10 text-center" style={{ background: '#111', border: '1px dashed #333' }}>
                <p className="text-gray-400 text-sm">No referrals yet</p>
              </div>
            )}
          </div>
        )}

        {tab === 'recharge' && (
          <div className="space-y-3">
            <button type="button" onClick={() => void loadAllFromSupabase()} className="w-full py-2 rounded-xl text-xs text-[#c9a84c]" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
              Refresh recharge records ({pendingRechargeCount} pending • {rechargeOrders.length} total)
            </button>
            {rechargeOrders.map((order) => {
              const status = getRechargeStatusStyle(order.status);
              return (
                <div key={order.id} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #2a2a2a' }}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-white font-bold">{formatUGX(Number(order.amount || 0))}</p>
                      <p className="text-gray-400 text-xs mt-1">{order.phone_number || 'No phone'} • {order.payment_method || 'PesaJet'}</p>
                      <p className="text-gray-500 text-[10px] mt-1 break-all">Ref: {order.id}</p>
                    </div>
                    <span className="h-fit px-2 py-1 rounded-full text-[10px] font-black" style={{ color: status.color, background: status.background }}>{status.label}</span>
                  </div>
                  <p className="text-gray-600 text-[10px] mt-3">{formatDate(order.submitted_at || order.created_at)}</p>
                </div>
              );
            })}
            {rechargeOrders.length === 0 && !loading && (
              <div className="rounded-2xl p-10 text-center" style={{ background: '#111', border: '1px dashed #333' }}>
                <p className="text-gray-400 text-sm">No recharge records found.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'withdraw' && (
          <div className="space-y-3">
            <button type="button" onClick={() => void loadAllFromSupabase()} className="w-full py-2 rounded-xl text-xs text-[#c9a84c]" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
              Refresh withdrawals ({withdrawOrders.length})
            </button>
            {withdrawOrders.map((order) => {
              const user = users.find((item) => item.id === order.userId || item.phone === order.phoneNumber);
              return (
                <div key={`SUPABASE-${order.id}`} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #2a2a2a' }}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-white font-bold">{formatUGX(order.amount)} • SUPABASE</p>
                      <p className="text-gray-400 text-xs mt-1">{user?.phone || order.userId || 'Unknown user'} • {order.phoneNumber || 'No phone'}</p>
                    </div>
                    <span className="h-fit px-2 py-1 rounded-full text-[10px]" style={getGeneralStatusStyle(order.status)}>{order.status}</span>
                  </div>
                  {order.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button type="button" onClick={() => void handleWithdrawalDecision(order, 'approve')} className="py-2.5 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button>
                      <button type="button" onClick={() => void handleWithdrawalDecision(order, 'reject')} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button>
                    </div>
                  )}
                </div>
              );
            })}
            {withdrawOrders.length === 0 && (
              <div className="rounded-2xl p-10 text-center" style={{ background: '#111', border: '1px dashed #333' }}>
                <p className="text-gray-400 text-sm">No withdrawals found.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'products' && (
          <div className="space-y-3">
            <button type="button" onClick={() => void loadAllFromSupabase()} className="w-full py-2 rounded-xl text-xs text-[#c9a84c]" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)' }}>
              Refresh products ({allUserProducts.length} purchases)
            </button>
            {PRODUCTS.map((product) => {
              const purchases = allUserProducts.filter((item) => item.productId === product.id || item.product_id === product.id);
              return (
                <div key={product.id} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #2a2a2a' }}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold text-sm">VIP{product.vip} {product.name}</p>
                      <p className="text-[#c9a84c] font-bold">{formatUGX(product.price)} • Daily {formatUGX(product.dailyIncome)}</p>
                      <p className="text-gray-500 text-[10px]">{purchases.length} purchases • {purchases.filter((item) => String(item.status).toLowerCase() === 'active').length} active</p>
                    </div>
                    <p className="text-white font-black text-xl">{purchases.length}</p>
                  </div>
                  {purchases.slice(0, 3).map((purchase: any) => (
                    <p key={`SUPABASE-${purchase.id}`} className="text-gray-600 text-[10px] mt-2">• {users.find((user) => user.id === purchase.userId)?.phone || String(purchase.userId || '').slice(0, 8)} — {formatDate(purchase.purchaseDate)} — SUPABASE</p>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'gifts' && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p className="text-white font-bold text-sm mb-3">Create Redeem Code</p>
              <button type="button" onClick={handleCreateGiftCode} className="w-full py-3 rounded-xl font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>+ Create Redeem Code</button>
            </div>
            {getGiftCodes().map((giftCode: any) => (
              <div key={giftCode.id} className="rounded-xl p-3 flex justify-between items-center" style={{ background: '#111', border: '1px solid #2a2a2a' }}>
                <div>
                  <p className="text-[#c9a84c] font-black text-sm">{giftCode.code}</p>
                  <p className="text-white text-xs">{formatUGX(giftCode.amount)}{giftCode.usedBy ? ' • USED' : ''}</p>
                </div>
                <button type="button" aria-label={`Delete redeem code ${giftCode.code}`} onClick={() => { if (!window.confirm(`Delete code ${giftCode.code}?`)) return; deleteGiftCode(giftCode.id); toast.success('Redeem code deleted.'); setRefresh((value) => value + 1); }} className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'resets' && (
          <div className="space-y-3">
            {passwordResets.map((request: PasswordResetRequest) => (
              <div key={request.id} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #2a2a2a' }}>
                <div className="flex justify-between mb-2">
                  <p className="text-white font-bold text-sm">{request.phone}</p>
                  <span className="px-2 py-1 rounded-full text-[10px]" style={getGeneralStatusStyle(request.status)}>{request.status}</span>
                </div>
                {request.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { approvePasswordReset(request.id); toast.success('Password reset approved.'); setRefresh((value) => value + 1); }} className="py-2 rounded-xl text-xs font-black text-black" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>Approve</button>
                    <button type="button" onClick={() => { rejectPasswordReset(request.id); toast.success('Password reset rejected.'); setRefresh((value) => value + 1); }} className="py-2 rounded-xl text-xs font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>Reject</button>
                  </div>
                )}
              </div>
            ))}
            {passwordResets.length === 0 && (
              <div className="rounded-2xl p-10 text-center" style={{ background: '#111', border: '1px dashed #333' }}>
                <p className="text-gray-400 text-sm">No password reset requests.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ===== FIXED: ADJUST BALANCE MODAL ===== */}
      {adjustUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setAdjustUser(null)}>
          <div className="w-full max-w-md rounded-3xl p-5" style={{ background: '#111827', border: '1px solid #1f2937' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-black text-xl">Adjust Balance</h3>
                <p className="text-gray-400 text-sm mt-0.5">{adjustUser.name || adjustUser.full_name || 'User'} • {adjustUser.phone}</p>
              </div>
              <button type="button" onClick={() => setAdjustUser(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#1f2937' }}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-2xl px-4 py-3 mt-4" style={{ background: '#1f2937' }}>
              <span className="text-gray-400">Current Balance</span>
              <span className="text-green-400 font-black text-lg">{formatUGX(adjustUser.balance)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button type="button" onClick={() => setAdjustType('ADD')} className={`py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 ${adjustType === 'ADD' ? 'bg-green-500 text-white' : 'text-gray-400'}`} style={adjustType !== 'ADD' ? { background: '#1f2937' } : undefined}>
                <Plus size={18} /> Add
              </button>
              <button type="button" onClick={() => setAdjustType('DEDUCT')} className={`py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 ${adjustType === 'DEDUCT' ? 'bg-red-500 text-white' : 'text-gray-400'}`} style={adjustType !== 'DEDUCT' ? { background: '#1f2937' } : undefined}>
                <Minus size={18} /> Deduct
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-4 mb-2">Amount (UGX)</p>
            <input value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="e.g. 10000" className="w-full rounded-2xl px-4 py-4 text-white text-lg outline-none placeholder-gray-500" style={{ background: '#1f2937', border: '1px solid #374151' }} />
            <div className="flex gap-2 mt-3">
              {quickAmounts.map((q) => (
                <button key={q} type="button" onClick={() => setAdjustAmount(String(q))} className={`flex-1 py-2 rounded-full text-sm font-bold ${parsedAdjustAmount === q ? 'bg-green-500 text-white' : 'text-gray-400'}`} style={parsedAdjustAmount !== q ? { background: '#1f2937' } : undefined}>
                  {q >= 1000 ? `${q / 1000}K` : q}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void confirmAdjust()} disabled={!parsedAdjustAmount || adjusting} className="w-full mt-4 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: adjustType === 'ADD' ? '#22c55e' : '#ef4444', color: '#fff' }}>
              {adjustType === 'ADD' ? <Plus size={18} /> : <Minus size={18} />}
              {adjusting ? 'Saving...' : `${adjustType === 'ADD' ? 'Add' : 'Deduct'} ${parsedAdjustAmount ? formatUGX(parsedAdjustAmount) : '— UGX'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, valueColor }: { icon: React.ReactNode; iconBg: string; label: string; value: string; valueColor: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid #1f2937' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: iconBg }}>{icon}</div>
      <p className="text-gray-400 text-[12px]">{label}</p>
      <p className="font-black text-sm mt-1" style={{ color: valueColor }}>{value}</p>
    </div>
  );
           }
