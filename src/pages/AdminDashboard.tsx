import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogOut, Users, Package, DollarSign, TrendingUp, CheckCircle, XCircle, Trash2, Plus, BarChart2, GitBranch, ArrowUpRight, ArrowDownLeft, Lock, Unlock, AlertTriangle, Bell, Send, Download, Clock, PlayCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  getAdminSession, setAdminSession,
  getUsers, deleteUserById,
  getProducts, updateProduct, deleteProduct,
  getWithdrawals, updateWithdrawal, createWithdrawal,
  getRecharges, updateRecharge,
  getWallets, deleteWalletsByUser,
  getNotifications, deleteNotificationsByUser,
  getRedeemCodes, createRedeemCode, deleteRedeemCodeById, updateRedeemCode,
  addNotification, updateUser, runDailyIncomeWithStats
} from '@/lib/storage';
import { formatUGX, formatDateTime, generateId, addDays } from '@/lib/utils';
import { PACKAGES } from '@/constants/packages';
import { User, UserProduct, Withdrawal, Recharge } from '@/types';

type AdminTab = 'overview' | 'analytics' | 'users' | 'packages' | 'withdrawals' | 'recharges' | 'redeem' | 'missions' | 'broadcast' | 'scheduler';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16'];

const fmtK = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
}

const MISSION_DEFS = [
  { id: 'ref_5', category: 'Referral', description: 'Invite 5 Level 1 investors', reward: 8000, target: 5 },
  { id: 'ref_15', category: 'Referral', description: 'Invite 15 Level 1 investors', reward: 20000, target: 15 },
  { id: 'ref_50', category: 'Referral', description: 'Invite 50 Level 1 investors', reward: 50000, target: 50 },
  { id: 'buy_galaxy-a15', category: 'Purchase', description: 'Purchase Galaxy A15', reward: 200, target: 1 },
  { id: 'buy_galaxy-a25', category: 'Purchase', description: 'Purchase Galaxy A25', reward: 1000, target: 1 },
  { id: 'buy_galaxy-a35', category: 'Purchase', description: 'Purchase Galaxy A35', reward: 2000, target: 1 },
  { id: 'buy_galaxy-a55', category: 'Purchase', description: 'Purchase Galaxy A55', reward: 4000, target: 1 },
  { id: 'buy_galaxy-s23-fe', category: 'Purchase', description: 'Purchase Galaxy S23 FE', reward: 8000, target: 1 },
  { id: 'buy_galaxy-s24', category: 'Purchase', description: 'Purchase Galaxy S24', reward: 15000, target: 1 },
  { id: 'buy_galaxy-s24-plus', category: 'Purchase', description: 'Purchase Galaxy S24+', reward: 35000, target: 1 },
  { id: 'buy_galaxy-z-flip6', category: 'Purchase', description: 'Purchase Galaxy Z Flip6', reward: 70000, target: 1 },
  { id: 'team_500k', category: 'Team', description: 'Team invest UGX 500,000', reward: 1000, target: 500000 },
  { id: 'team_1500k', category: 'Team', description: 'Team invest UGX 1,500,000', reward: 1500, target: 1500000 },
  { id: 'team_5m', category: 'Team', description: 'Team invest UGX 5,000,000', reward: 5000, target: 5000000 },
  { id: 'team_15m', category: 'Team', description: 'Team invest UGX 15,000,000', reward: 15000, target: 15000000 },
  { id: 'team_30m', category: 'Team', description: 'Team invest UGX 30,000,000', reward: 30000, target: 30000000 },
];

const MissionsAdmin = ({ users, products }: { users: User[]; products: UserProduct[] }) => {
  const totalRewardsPaid = MISSION_DEFS.reduce((sum, m) => {
    const claimers = users.filter((u) => u.claimedMissions?.includes(m.id));
    return sum + claimers.length * m.reward;
  }, 0);
  const totalClaims = users.reduce((sum, u) => sum + (u.claimedMissions?.length || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-gray-400 text-xs mb-1">Total Claims</div><div className="text-blue-600 font-bold text-xl">{totalClaims}</div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm"><div className="text-gray-400 text-xs mb-1">Rewards Paid</div><div className="text-green-600 font-bold text-base">{formatUGX(totalRewardsPaid)}</div></div>
      </div>
      {MISSION_DEFS.map((m) => {
        const claimers = users.filter((u) => u.claimedMissions?.includes(m.id));
        const catColor = m.category === 'Referral' ? 'bg-blue-100 text-blue-700' : m.category === 'Purchase' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700';
        return (
          <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor}`}>{m.category}</span>
                <div className="text-gray-800 font-semibold text-sm mt-1">{m.description}</div>
              </div>
              <div className="text-right shrink-0"><div className="text-green-600 font-bold text-sm">{formatUGX(m.reward)}</div><div className="text-gray-400 text-xs">reward</div></div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{claimers.length} user{claimers.length !== 1 ? 's' : ''} claimed</span>
              <span className="text-blue-600 font-semibold">Total paid: {formatUGX(claimers.length * m.reward)}</span>
            </div>
            {claimers.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-50">
                <div className="text-gray-400 text-[10px] mb-1">Claimed by:</div>
                <div className="flex flex-wrap gap-1">{claimers.map((u) => <span key={u.id} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{u.name}</span>)}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [redeemCodes, setRedeemCodes] = useState<any[]>([]);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [adjustUser, setAdjustUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'frozen'>('all');
  const [newCode, setNewCode] = useState('');
  const [newCodeAmount, setNewCodeAmount] = useState('');
  const [expandedTrees, setExpandedTrees] = useState<Set<string>>(new Set());
  const [schedulerLog, setSchedulerLog] = useState<{ts: string; credited: number; total: number; errors?: string[]} | null>(null);
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [runningIncome, setRunningIncome] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const prevPendingRecharges = useRef<number>(-1);
  const prevPendingPackages = useRef<number>(-1);
  const prevUserCount = useRef<number>(-1);

  useEffect(() => {
    if (!getAdminSession()) { navigate('/admin'); return; }
    refresh();
  }, [navigate]);

  const refresh = async () => {
    const [u, p, w, r, rc] = await Promise.all([
      getUsers(), getProducts(), getWithdrawals(), getRecharges(), getRedeemCodes()
    ]);
    setUsers(u);
    setProducts(p);
    setWithdrawals(w);
    setRecharges(r);
    setRedeemCodes(rc);
    setDataLoaded(true);
  };

  useEffect(() => {
    if (!dataLoaded) return;
    prevPendingRecharges.current = recharges.filter((r) => r.status === 'pending').length;
    prevPendingPackages.current = products.filter((p) => p.status === 'pending').length;
    prevUserCount.current = users.length;
  }, [dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(async () => {
      const [latestRecharges, latestProducts, latestUsers] = await Promise.all([
        getRecharges(), getProducts(), getUsers()
      ]);
      const newPending = latestRecharges.filter((r) => r.status === 'pending').length;
      const newPkgPending = latestProducts.filter((p) => p.status === 'pending').length;
      const newUserCount = latestUsers.length;

      if (prevPendingRecharges.current !== -1 && newPending > prevPendingRecharges.current) {
        const diff = newPending - prevPendingRecharges.current;
        toast.info(`🔔 ${diff} new recharge${diff > 1 ? 's' : ''} submitted!`, { duration: 6000 });
      }
      if (prevPendingPackages.current !== -1 && newPkgPending > prevPendingPackages.current) {
        const diff = newPkgPending - prevPendingPackages.current;
        toast.info(`📦 ${diff} new package${diff > 1 ? 's' : ''} awaiting approval!`, { duration: 6000 });
      }
      if (prevUserCount.current !== -1 && newUserCount > prevUserCount.current) {
        const diff = newUserCount - prevUserCount.current;
        toast.success(`👤 ${diff} new user${diff > 1 ? 's' : ''} registered!`, { duration: 6000 });
      }

      prevPendingRecharges.current = newPending;
      prevPendingPackages.current = newPkgPending;
      prevUserCount.current = newUserCount;

      setUsers(latestUsers);
      setProducts(latestProducts);
      setRecharges(latestRecharges);
      const [w, rc] = await Promise.all([getWithdrawals(), getRedeemCodes()]);
      setWithdrawals(w);
      setRedeemCodes(rc);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { setAdminSession(false); navigate('/admin'); toast.success('Logged out'); };

  const approvePackage = async (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const updatedProd = { ...prod, status: 'active' as const, buyDate: new Date().toISOString(), expiryDate: addDays(new Date(), prod.duration).toISOString(), lastIncomeDate: new Date().toISOString() };
    await updateProduct(updatedProd);

    const user = users.find((u) => u.id === prod.userId);
    if (user?.referredBy) {
      const l1 = users.find((u) => u.id === user.referredBy);
      if (l1) {
        const commission = Math.round(prod.packagePrice * 0.30);
        await updateUser({ ...l1, balance: l1.balance + commission, referralEarnings: l1.referralEarnings + commission, totalEarnings: l1.totalEarnings + commission });
        await addNotification({ userId: l1.id, type: 'referral_bonus', title: 'Referral Commission!', message: `You earned UGX ${commission.toLocaleString()} (30%) from ${user.name}'s investment.`, isRead: false });

        if (l1.referredBy) {
          const l2 = users.find((u) => u.id === l1.referredBy);
          if (l2) {
            const c2 = Math.round(prod.packagePrice * 0.02);
            await updateUser({ ...l2, balance: l2.balance + c2, referralEarnings: l2.referralEarnings + c2, totalEarnings: l2.totalEarnings + c2 });
            await addNotification({ userId: l2.id, type: 'referral_bonus', title: 'L2 Commission!', message: `You earned UGX ${c2.toLocaleString()} (2%) from L2 investment.`, isRead: false });

            if (l2.referredBy) {
              const l3 = users.find((u) => u.id === l2.referredBy);
              if (l3) {
                const c3 = Math.round(prod.packagePrice * 0.01);
                await updateUser({ ...l3, balance: l3.balance + c3, referralEarnings: l3.referralEarnings + c3, totalEarnings: l3.totalEarnings + c3 });
              }
            }
          }
        }
      }
    }

    await addNotification({ userId: prod.userId, type: 'package_approved', title: 'Package Approved!', message: `Your ${prod.packageName} is now active. Daily income started!`, isRead: false });
    await refresh();
    toast.success('Package approved! Daily income started.');
  };

  const rejectPackage = async (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const user = users.find((u) => u.id === prod.userId);
    if (user) await updateUser({ ...user, balance: user.balance + prod.packagePrice });
    await updateProduct({ ...prod, status: 'expired' as const });
    await addNotification({ userId: prod.userId, type: 'package_rejected', title: 'Package Rejected', message: `Your ${prod.packageName} was rejected. Amount refunded.`, isRead: false });
    await refresh();
    toast.success('Package rejected & refunded.');
  };

  const approveWithdrawal = async (wId: string) => {
    const w = withdrawals.find((x) => x.id === wId);
    if (!w) return;
    const user = users.find((u) => u.id === w.userId);
    if (!user) return;
    await updateUser({ ...user, balance: user.balance - w.amount, totalWithdrawal: user.totalWithdrawal + w.amount });
    await updateWithdrawal({ ...w, status: 'approved', processedAt: new Date().toISOString() });
    await addNotification({ userId: w.userId, type: 'withdrawal_approved', title: 'Withdrawal Approved!', message: `UGX ${w.netAmount.toLocaleString()} sent to ${w.walletPhone}.`, isRead: false });
    await refresh();
    toast.success('Withdrawal approved!');
  };

  const rejectWithdrawal = async (wId: string) => {
    const w = withdrawals.find((x) => x.id === wId);
    if (!w) return;
    await updateWithdrawal({ ...w, status: 'rejected', processedAt: new Date().toISOString() });
    await addNotification({ userId: w.userId, type: 'withdrawal_rejected', title: 'Withdrawal Rejected', message: `Your withdrawal of ${formatUGX(w.amount)} was rejected.`, isRead: false });
    await refresh();
    toast.success('Withdrawal rejected');
  };

  const approveRecharge = async (rId: string) => {
    const r = recharges.find((x) => x.id === rId);
    if (!r) return;
    const user = users.find((u) => u.id === r.userId);
    if (!user) return;
    await updateUser({ ...user, balance: user.balance + r.amount });
    await updateRecharge({ ...r, status: 'approved', processedAt: new Date().toISOString() });
    await addNotification({ userId: r.userId, type: 'package_approved', title: 'Recharge Approved!', message: `UGX ${r.amount.toLocaleString()} added to your account.`, isRead: false });
    await refresh();
    toast.success('Recharge approved!');
  };

  const rejectRecharge = async (rId: string) => {
    const r = recharges.find((x) => x.id === rId);
    if (!r) return;
    await updateRecharge({ ...r, status: 'rejected', processedAt: new Date().toISOString() });
    await refresh();
    toast.success('Recharge rejected');
  };

  const handleCreateRedeemCode = async () => {
    if (!newCode.trim() || !newCodeAmount) { toast.error('Fill code and amount'); return; }
    await createRedeemCode({
      id: generateId(),
      code: newCode.trim().toUpperCase(),
      amount: parseInt(newCodeAmount),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      usedBy: [],
      isActive: true,
    });
    setNewCode('');
    setNewCodeAmount('');
    await refresh();
    toast.success('Redeem code created! Valid for 15 minutes.');
  };

  const handleFreezeToggle = async (userId: string, currentFrozen: boolean) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    await updateUser({ ...u, frozen: !currentFrozen });
    await addNotification({
      userId,
      type: 'package_approved',
      title: currentFrozen ? 'Account Unfrozen' : 'Account Frozen',
      message: currentFrozen ? 'Your account has been unfrozen by admin. You can now make withdrawals and purchases.' : 'Your account has been frozen by admin. Withdrawals and purchases are disabled. Contact support for help.',
      isRead: false,
    });
    await refresh();
    toast.success(`Account ${currentFrozen ? 'unfrozen' : 'frozen'} successfully.`);
  };

  const handleAdjustBalance = async () => {
    if (!adjustUser) return;
    const amt = parseInt(adjustAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (!adjustReason.trim()) { toast.error('Please enter a reason'); return; }
    setAdjusting(true);

    const freshUser = users.find((u) => u.id === adjustUser.id);
    if (!freshUser) { setAdjusting(false); return; }
    const newBalance = adjustType === 'add' ? freshUser.balance + amt : Math.max(0, freshUser.balance - amt);
    await updateUser({ ...freshUser, balance: newBalance });
    await addNotification({
      userId: freshUser.id,
      type: 'package_approved',
      title: adjustType === 'add' ? 'Balance Added' : 'Balance Deducted',
      message: `Admin ${adjustType === 'add' ? 'added' : 'deducted'} ${formatUGX(amt)} ${adjustType === 'add' ? 'to' : 'from'} your account. Reason: ${adjustReason}`,
      isRead: false,
    });
    await refresh();
    toast.success(`Balance ${adjustType === 'add' ? 'added' : 'deducted'} successfully!`);
    setAdjustUser(null);
    setAdjustAmount('');
    setAdjustReason('');
    setAdjustType('add');
    setAdjusting(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setDeletingUser(true);
    const uid = deleteUserTarget.id;
    // Delete associated products
    const userProds = products.filter(p => p.userId === uid);
    await Promise.all(userProds.map(p => deleteProduct(p.id)));
    await Promise.all([
      deleteWalletsByUser(uid),
      deleteNotificationsByUser(uid),
    ]);
    await deleteUserById(uid);
    await refresh();
    toast.success(`User "${deleteUserTarget.name}" and all associated data permanently deleted.`);
    setDeleteUserTarget(null);
    setDeletingUser(false);
    };

  const handleExportUsersCSV = () => {
    const headers = ['Name', 'Phone', 'Referral Code', 'Balance (UGX)', 'Total Earnings (UGX)', 'Direct Referrals', 'Referred By', 'Join Date', 'Frozen'];
    const rows = users.map((u) => {
      const totalInvested = products.filter((p) => p.userId === u.id).reduce((s, p) => s + p.packagePrice, 0);
      const directReferrals = users.filter((x) => x.referredBy === u.id).length;
      const referrer = u.referredBy ? users.find((x) => x.id === u.referredBy) : null;
      return [`"${u.name}"`, u.phone, u.referralCode, u.balance, totalInvested, u.totalEarnings, directReferrals, referrer ? `"${referrer.name}"` : 'Direct', new Date(u.createdAt).toLocaleDateString(), u.frozen ? 'Yes' : 'No'];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `samsung-earnings-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${users.length} users to CSV!`);
  };

  const toggleTree = (userId: string) => {
    setExpandedTrees((prev) => { const next = new Set(prev); if (next.has(userId)) next.delete(userId); else next.add(userId); return next; });
  };

  const handleRunDailyIncome = async () => {
    setRunningIncome(true);
    const { credited, total } = await runDailyIncomeWithStats();
    await refresh();
    if (credited === 0) toast.info('No active packages are due for income right now — all packages were credited less than 24 hours ago.');
    else toast.success(`✅ Daily income distributed! ${credited} package${credited !== 1 ? 's' : ''} credited — Total: ${formatUGX(total)}`);
    setRunningIncome(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) { toast.error('Enter both title and message'); return; }
    setBroadcasting(true);
    await Promise.all(users.map(u => addNotification({ userId: u.id, type: 'package_approved', title: broadcastTitle.trim(), message: broadcastMsg.trim(), isRead: false })));
    toast.success(`📣 Broadcast sent to ${users.length} users!`);
    setBroadcastTitle('');
    setBroadcastMsg('');
    setBroadcasting(false);
  };

  const totalUsers = users.length;
  const totalActiveProducts = products.filter((p) => p.status === 'active').length;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending').length;
  const pendingRecharges = recharges.filter((r) => r.status === 'pending').length;
  const totalWithdrawn = withdrawals.filter((w) => w.status === 'approved').reduce((s, w) => s + w.amount, 0);
  const totalRecharged = recharges.filter((r) => r.status === 'approved').reduce((s, r) => s + r.amount, 0);
  const totalPendingAlerts = pendingRecharges + products.filter((p) => p.status === 'pending').length + pendingWithdrawals;

  const analyticsData = useMemo(() => {
    const days = getLast7Days();
    const revenueData = days.map((day) => ({ day, Recharges: recharges.filter((r) => r.status === 'approved' && dayLabel(r.createdAt) === day).reduce((s, r) => s + r.amount, 0), Withdrawals: withdrawals.filter((w) => w.status === 'approved' && dayLabel(w.createdAt) === day).reduce((s, w) => s + w.amount, 0) }));
    const userGrowth = days.map((day) => ({ day, Users: users.filter((u) => dayLabel(u.createdAt) <= day).length }));
    const packageMap: Record<string, number> = {};
    products.forEach((p) => { packageMap[p.packageName] = (packageMap[p.packageName] || 0) + p.packagePrice; });
    const packageDist = Object.entries(packageMap).map(([name, value]) => ({ name, value }));
    const l1Total = users.reduce((s, u) => s + u.referralEarnings, 0);
    const referralData = [
      { level: 'L1 (30%)', commission: l1Total, fill: '#3b82f6' },
      { level: 'L2 (2%)', commission: Math.round(l1Total * 0.07), fill: '#10b981' },
      { level: 'L3 (1%)', commission: Math.round(l1Total * 0.035), fill: '#8b5cf6' },
    ];
    const incomeByGroup: Record<string, number> = { 'Group 1': 0, 'Group 2': 0, 'Group 3': 0 };
    products.filter((p) => p.status === 'active').forEach((p) => { const pkg = PACKAGES.find((x) => x.id === p.packageId); if (pkg) incomeByGroup[`Group ${pkg.group}`] += p.dailyIncome; });
    const incomeData = Object.entries(incomeByGroup).map(([name, value]) => ({ name, value }));
    const topInvestors = [...users].map((u) => ({ name: u.name, invested: products.filter((p) => p.userId === u.id).reduce((s, p) => s + p.packagePrice, 0), earnings: u.totalEarnings, team: users.filter((x) => x.referredBy === u.id).length })).sort((a, b) => b.invested - a.invested).slice(0, 5);
    return { revenueData, userGrowth, packageDist, referralData, incomeData, topInvestors };
  }, [users, products, recharges, withdrawals]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.phone.includes(q);
      const matchFilter = userFilter === 'all' || (userFilter === 'frozen' ? !!u.frozen : !u.frozen);
      return matchSearch && matchFilter;
    });
  }, [users, userSearch, userFilter]);

  const handleTriggerScheduler = async () => {
    setRunningScheduler(true);
    setSchedulerLog(null);
    try {
      const { data, error } = await supabase.functions.invoke('daily-income-scheduler');
      if (error) {
        let msg = error.message;
        const { FunctionsHttpError } = await import('@supabase/supabase-js');
        if (error instanceof FunctionsHttpError) {
          try { msg = await error.context?.text() || msg; } catch { /* ignore */ }
        }
        toast.error(`Scheduler error: ${msg}`);
      } else if (data) {
        setSchedulerLog({ ts: data.timestamp, credited: data.credited, total: data.total, errors: data.errors });
        if (data.credited === 0) toast.info('No packages were due — all credited within last 24 hours.');
        else toast.success(`✅ ${data.credited} packages credited — Total UGX ${(data.total as number).toLocaleString()}`);
      }
    } catch (e: unknown) {
      toast.error(`Failed to invoke scheduler: ${e instanceof Error ? e.message : String(e)}`);
    }
    setRunningScheduler(false);
  };

  const TABS: { key: AdminTab; label: string; badge?: number }[] = [
    { key: 'overview', label: 'Overview', badge: totalPendingAlerts > 0 ? totalPendingAlerts : undefined },
    { key: 'analytics', label: 'Analytics' },
    { key: 'packages', label: 'Packages', badge: products.filter((p) => p.status === 'pending').length || undefined },
    { key: 'withdrawals', label: 'Withdrawals', badge: pendingWithdrawals || undefined },
    { key: 'recharges', label: 'Recharges', badge: pendingRecharges || undefined },
    { key: 'users', label: 'Users' },
    { key: 'broadcast', label: 'Broadcast' },
    { key: 'scheduler', label: '⏰ Scheduler' },
    { key: 'redeem', label: 'Redeem Codes' },
    { key: 'missions', label: 'Missions' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0a0f2e, #1a1a4e)' }}>
        <div>
          <div className="text-white font-bold text-base">Samsung Admin Panel</div>
          <div className="text-amber-300 text-xs">Full Platform Control</div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 bg-red-500/20 text-red-300 px-3 py-1.5 rounded-xl text-sm">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide sticky top-[57px] z-40">
        {TABS.map(({ key, label, badge }) => (
          <button key={key} onClick={() => setTab(key)} className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium relative transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {label}
            {badge ? <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{badge}</span> : null}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ─── Overview ─── */}
        {tab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Users className="w-5 h-5 text-blue-500" />, label: 'Total Users', value: totalUsers, color: 'text-blue-600' },
                { icon: <Package className="w-5 h-5 text-green-500" />, label: 'Active Products', value: totalActiveProducts, color: 'text-green-600' },
                { icon: <DollarSign className="w-5 h-5 text-amber-500" />, label: 'Total Recharged', value: formatUGX(totalRecharged), color: 'text-amber-600' },
                { icon: <TrendingUp className="w-5 h-5 text-purple-500" />, label: 'Total Withdrawn', value: formatUGX(totalWithdrawn), color: 'text-purple-600' },
              ].map(({ icon, label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">{icon}<span className="text-gray-500 text-xs">{label}</span></div>
                  <div className={`${color} font-bold text-base`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Run Daily Income */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-gray-800 text-sm">Daily Income Engine</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-gray-400 text-xs mb-3 leading-relaxed">Manually trigger daily income for all active packages. Only packages not credited in the last 24 hours will receive income.</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-center">
                    <div className="text-green-600 font-bold text-base">{products.filter(p => p.status === 'active').length}</div>
                    <div className="text-green-500 text-[10px] font-medium">Active Packages</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-center">
                    <div className="text-blue-600 font-bold text-base">{formatUGX(products.filter(p => p.status === 'active').reduce((s, p) => s + p.dailyIncome, 0))}</div>
                    <div className="text-blue-500 text-[10px] font-medium">Max Daily Payout</div>
                  </div>
                </div>
                <button onClick={handleRunDailyIncome} disabled={runningIncome || products.filter(p => p.status === 'active').length === 0} className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  {runningIncome ? (<><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" /><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" /></svg>Running...</>) : (<><TrendingUp className="w-4 h-4" /> Run Daily Income Now</>)}
                </button>
              </div>
              </div>

            {pendingRecharges > 0 && (
              <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #0a0f2e, #1d4ed8)' }}>
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse" />
                    <span className="text-white font-bold text-sm">New Recharge Alerts</span>
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingRecharges}</span>
                  </div>
                  <button onClick={() => setTab('recharges')} className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-xl font-semibold">Review All</button>
                </div>
                <div className="divide-y divide-white/10 max-h-48 overflow-y-auto">
                  {recharges.filter((r) => r.status === 'pending').slice().reverse().map((r) => {
                    const u = users.find((x) => x.id === r.userId);
                    return (
                      <button key={r.id} onClick={() => setTab('recharges')} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">{(u?.name || 'U').charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="text-white text-sm font-semibold">{u?.name || r.userName || 'Unknown'}</div>
                            <div className="text-blue-200 text-xs">{r.network === 'mtn' ? '📲 MTN' : '📱 Airtel'} • {r.senderPhone}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-amber-300 font-bold text-sm">{formatUGX(r.amount)}</div>
                          <div className="text-blue-300 text-[10px]">⏳ Pending</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(pendingWithdrawals > 0 || products.filter((p) => p.status === 'pending').length > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="font-semibold text-amber-700 text-sm mb-2">⚠️ Pending Actions</div>
                <div className="space-y-1 text-sm text-amber-600">
                  {products.filter((p) => p.status === 'pending').length > 0 && <button onClick={() => setTab('packages')} className="block">• {products.filter((p) => p.status === 'pending').length} pending packages</button>}
                  {pendingWithdrawals > 0 && <button onClick={() => setTab('withdrawals')} className="block">• {pendingWithdrawals} pending withdrawals</button>}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-800 text-sm">Recent Registrations</span>
                <button onClick={() => setTab('users')} className="text-blue-600 text-xs font-medium">View All ({users.length})</button>
              </div>
              {users.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">No users yet</div>
              ) : (
                users.slice(0, 5).map((u) => {
                  const referrer = u.referredBy ? users.find((x) => x.id === u.referredBy) : null;
                  const totalInvested = products.filter((p) => p.userId === u.id).reduce((s, p) => s + p.packagePrice, 0);
                  return (
                    <div key={u.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="text-gray-800 text-sm font-semibold">{u.name}</div>
                            <div className="text-gray-400 text-xs">{u.phone} • Code: <span className="text-amber-600 font-bold">{u.referralCode}</span></div>
                          </div>
                        </div>
                        <div className="text-right shrink-0"><div className="text-blue-600 text-sm font-bold">{formatUGX(u.balance)}</div><div className="text-gray-400 text-xs">balance</div></div>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        {referrer ? <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Referred by: <b>{referrer.name}</b></span> : <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">Direct signup</span>}
                        {totalInvested > 0 && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Invested: {formatUGX(totalInvested)}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── Analytics ─── */}
        {tab === 'analytics' && (
          <div className="space-y-5 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Revenue', value: formatUGX(recharges.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0)), icon: <ArrowDownLeft className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Total Paid Out', value: formatUGX(withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0)), icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Active Packages', value: products.filter(p => p.status === 'active').length, icon: <Package className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Total Members', value: users.length, icon: <Users className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className={`w-8 h-8 rounded-xl ${bg} ${color} flex items-center justify-center mb-2`}>{icon}</div>
                  <div className={`${color} font-bold text-lg leading-tight`}>{value}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><BarChart2 className="w-4 h-4 text-blue-500" /><span className="font-semibold text-gray-800 text-sm">Revenue vs Payouts — Last 7 Days</span></div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={analyticsData.revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRecharge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorWithdraw" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} width={36} />
                  <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Recharges" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRecharge)" />
                  <Area type="monotone" dataKey="Withdrawals" stroke="#ef4444" strokeWidth={2} fill="url(#colorWithdraw)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-green-500" /><span className="font-semibold text-gray-800 text-sm">User Growth — Last 7 Days</span></div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={analyticsData.userGrowth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} width={28} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Line type="monotone" dataKey="Users" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-purple-500" /><span className="font-semibold text-gray-800 text-sm">Investment by Package</span></div>
              {analyticsData.packageDist.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No packages purchased yet</div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={analyticsData.packageDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name.replace('Galaxy ', '')} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {analyticsData.packageDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full space-y-1.5 mt-1">
                    {analyticsData.packageDist.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-gray-600">{item.name}</span></div>
                        <span className="font-semibold text-gray-700">{formatUGX(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-amber-500" /><span className="font-semibold text-gray-800 text-sm">Daily Income by Group</span></div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={analyticsData.incomeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} width={36} />
                  <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="value" name="Daily Income" radius={[8, 8, 0, 0]}>
                    {analyticsData.incomeData.map((_, i) => <Cell key={i} fill={['#f59e0b', '#3b82f6', '#8b5cf6'][i % 3]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><GitBranch className="w-4 h-4 text-indigo-500" /><span className="font-semibold text-gray-800 text-sm">Referral Commission by Level</span></div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={analyticsData.referralData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} width={36} />
                  <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="commission" name="Commission" radius={[8, 8, 0, 0]}>
                    {analyticsData.referralData.map((entry) => <Cell key={entry.level} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /><span className="font-semibold text-gray-800 text-sm">Top Investors</span></div>
              {analyticsData.topInvestors.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">No investors yet</div>
              ) : (
                analyticsData.topInvestors.map((inv, i) => (
                  <div key={inv.name} className="px-4 py-3 border-b border-gray-50 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                    <div className="flex-1 min-w-0"><div className="text-gray-800 text-sm font-medium truncate">{inv.name}</div><div className="text-gray-400 text-xs">{inv.team} referrals</div></div>
                    <div className="text-right shrink-0"><div className="text-blue-600 text-sm font-bold">{formatUGX(inv.invested)}</div><div className="text-green-600 text-xs">earned {formatUGX(inv.earnings)}</div></div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── Packages ─── */}
        {tab === 'packages' && (
          <div className="space-y-3">
            {products.length === 0 ? <div className="text-center py-12 text-gray-400">No packages found</div> : (
              [...products].reverse().map((p) => {
                const user = users.find((u) => u.id === p.userId);
                return (
                  <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div><div className="font-bold text-gray-800 text-sm">{p.packageName}</div><div className="text-gray-500 text-xs">{user?.name || p.userId} • {user?.phone}</div></div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${p.status === 'pending' ? 'bg-amber-100 text-amber-700' : p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="bg-gray-50 rounded-lg px-2 py-1.5"><div className="text-gray-400">Investment</div><div className="font-bold text-gray-700">{formatUGX(p.packagePrice)}</div></div>
                      <div className="bg-gray-50 rounded-lg px-2 py-1.5"><div className="text-gray-400">Daily</div><div className="font-bold text-green-600">{formatUGX(p.dailyIncome)}</div></div>
                    </div>
                    {p.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => approvePackage(p.id)} className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4" /> Approve</button>
                        <button onClick={() => rejectPackage(p.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1"><XCircle className="w-4 h-4" /> Reject</button>
                      </div>
                    )}
                    {p.status !== 'pending' && <button onClick={() => deleteProduct(p.id).then(refresh)} className="w-full py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Withdrawals ─── */}
        {tab === 'withdrawals' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center"><div className="text-amber-600 font-bold text-lg">{withdrawals.filter(w => w.status === 'pending').length}</div><div className="text-gray-400 text-xs">Pending</div></div>
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center"><div className="text-green-600 font-bold text-base">{formatUGX(withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.netAmount, 0))}</div><div className="text-gray-400 text-xs">Total Paid Out</div></div>
            </div>
            {[...withdrawals].reverse().map((w) => {
              const isMTN = w.walletType === 'mtn';
              return (
                <div key={w.id} className={`rounded-2xl shadow-sm overflow-hidden ${w.status === 'pending' ? 'border-2 border-amber-300' : 'border border-gray-100'} bg-white`}>
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div><div className="font-bold text-gray-800 text-base">{w.userName}</div><div className="text-gray-400 text-xs">{w.userPhone}</div></div>
                    <div className="text-right">
                      <div className="text-blue-600 font-bold text-base">{formatUGX(w.amount)}</div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold capitalize ${w.status === 'pending' ? 'bg-amber-100 text-amber-700' : w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span>
                    </div>
                  </div>
                  <div className={`mx-4 mb-3 rounded-2xl p-3 ${isMTN ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 ${isMTN ? 'bg-yellow-400' : 'bg-red-500'}`}>{isMTN ? 'M' : 'A'}</div>
                        <div><div className={`text-xs font-black ${isMTN ? 'text-yellow-700' : 'text-red-700'}`}>{isMTN ? 'MTN Mobile Money' : 'Airtel Money'}</div><div className="text-gray-500 text-[10px]">Send payment to this number</div></div>
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMTN ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>{isMTN ? 'MTN' : 'Airtel'}</div>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 mb-2 shadow-sm">
                      <div><div className="text-gray-400 text-[10px] font-medium">WALLET NUMBER</div><div className="text-gray-900 font-black text-lg tracking-widest leading-tight">{w.walletPhone}</div></div>
                      <button onClick={() => { navigator.clipboard.writeText(w.walletPhone); toast.success('Phone number copied!'); }} className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold ${isMTN ? 'bg-yellow-400' : 'bg-red-500'}`}>COPY</button>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm">
                      <div><div className="text-gray-400 text-[10px] font-medium">ACCOUNT NAME</div><div className="text-gray-800 font-bold text-sm">{w.walletName}</div></div>
                      <button onClick={() => { navigator.clipboard.writeText(w.walletName); toast.success('Name copied!'); }} className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold">COPY</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 pb-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-1.5"><div className="text-green-500 text-[10px] font-medium">NET AMOUNT TO SEND</div><div className="text-green-700 font-black text-base">{formatUGX(w.netAmount)}</div></div>
                    <div className="text-right"><div className="text-gray-400 text-[10px]">Tax: {formatUGX(w.amount - w.netAmount)}</div><div className="text-gray-300 text-[10px]">{formatDateTime(w.createdAt)}</div></div>
                  </div>
                  {w.status === 'pending' && (
                    <div className="flex gap-2 px-4 pb-4">
                      <button onClick={() => approveWithdrawal(w.id)} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4" /> Approve & Mark Paid</button>
                      <button onClick={() => rejectWithdrawal(w.id)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1"><XCircle className="w-4 h-4" /> Reject</button>
                    </div>
                  )}
                  {w.status !== 'pending' && (
                    <div className="px-4 pb-4">
                      <div className={`text-center py-2 rounded-xl text-xs font-semibold ${w.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {w.status === 'approved' ? '✓ Payment sent & approved' : '✗ Rejected'}
                        {w.processedAt ? ` • ${formatDateTime(w.processedAt)}` : ''}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {withdrawals.length === 0 && <div className="text-center py-12 text-gray-400">No withdrawal requests</div>}
          </div>
        )}

        {/* ─── Recharges ─── */}
        {tab === 'recharges' && (
          <div className="space-y-3">
            {[...recharges].reverse().map((r) => {
              const user = users.find((u) => u.id === r.userId);
              return (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="font-bold text-gray-800">{formatUGX(r.amount)}</div><div className="text-gray-500 text-xs">{user?.name || r.userName} • {user?.phone || r.userPhone}</div></div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                  </div>
                  <div className="text-gray-500 text-xs mb-1">{r.network === 'mtn' ? '📲 MTN' : '📱 Airtel'} from {r.senderPhone}</div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 mb-3">{r.proof}</div>
                  <div className="text-gray-300 text-xs mb-3">{formatDateTime(r.createdAt)}</div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => approveRecharge(r.id)} className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold">✓ Approve</button>
                      <button onClick={() => rejectRecharge(r.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold">✗ Reject</button>
                    </div>
                  )}
                </div>
              );
            })}</div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-amber-500" /><span className="font-semibold text-gray-800 text-sm">Daily Income by Group</span></div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={analyticsData.incomeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} width={36} />
                  <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="value" name="Daily Income" radius={[8, 8, 0, 0]}>
                    {analyticsData.incomeData.map((_, i) => <Cell key={i} fill={['#f59e0b', '#3b82f6', '#8b5cf6'][i % 3]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><GitBranch className="w-4 h-4 text-indigo-500" /><span className="font-semibold text-gray-800 text-sm">Referral Commission by Level</span></div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={analyticsData.referralData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} width={36} />
                  <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="commission" name="Commission" radius={[8, 8, 0, 0]}>
                    {analyticsData.referralData.map((entry) => <Cell key={entry.level} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /><span className="font-semibold text-gray-800 text-sm">Top Investors</span></div>
              {analyticsData.topInvestors.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">No investors yet</div>
              ) : (
                analyticsData.topInvestors.map((inv, i) => (
                  <div key={inv.name} className="px-4 py-3 border-b border-gray-50 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                    <div className="flex-1 min-w-0"><div className="text-gray-800 text-sm font-medium truncate">{inv.name}</div><div className="text-gray-400 text-xs">{inv.team} referrals</div></div>
                    <div className="text-right shrink-0"><div className="text-blue-600 text-sm font-bold">{formatUGX(inv.invested)}</div><div className="text-green-600 text-xs">earned {formatUGX(inv.earnings)}</div></div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── Packages ─── */}
        {tab === 'packages' && (
          <div className="space-y-3">
            {products.length === 0 ? <div className="text-center py-12 text-gray-400">No packages found</div> : (
              [...products].reverse().map((p) => {
                const user = users.find((u) => u.id === p.userId);
                return (
                  <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div><div className="font-bold text-gray-800 text-sm">{p.packageName}</div><div className="text-gray-500 text-xs">{user?.name || p.userId} • {user?.phone}</div></div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${p.status === 'pending' ? 'bg-amber-100 text-amber-700' : p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="bg-gray-50 rounded-lg px-2 py-1.5"><div className="text-gray-400">Investment</div><div className="font-bold text-gray-700">{formatUGX(p.packagePrice)}</div></div>
                      <div className="bg-gray-50 rounded-lg px-2 py-1.5"><div className="text-gray-400">Daily</div><div className="font-bold text-green-600">{formatUGX(p.dailyIncome)}</div></div>
                    </div>
                    {p.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => approvePackage(p.id)} className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4" /> Approve</button>
                        <button onClick={() => rejectPackage(p.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1"><XCircle className="w-4 h-4" /> Reject</button>
                      </div>
                    )}
                    {p.status !== 'pending' && <button onClick={() => deleteProduct(p.id).then(refresh)} className="w-full py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Withdrawals ─── */}
        {tab === 'withdrawals' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center"><div className="text-amber-600 font-bold text-lg">{withdrawals.filter(w => w.status === 'pending').length}</div><div className="text-gray-400 text-xs">Pending</div></div>
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center"><div className="text-green-600 font-bold text-base">{formatUGX(withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.netAmount, 0))}</div><div className="text-gray-400 text-xs">Total Paid Out</div></div>
            </div>
            {[...withdrawals].reverse().map((w) => {
              const isMTN = w.walletType === 'mtn';
              return (
                <div key={w.id} className={`rounded-2xl shadow-sm overflow-hidden ${w.status === 'pending' ? 'border-2 border-amber-300' : 'border border-gray-100'} bg-white`}>
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div><div className="font-bold text-gray-800 text-base">{w.userName}</div><div className="text-gray-400 text-xs">{w.userPhone}</div></div>
                    <div className="text-right">
                      <div className="text-blue-600 font-bold text-base">{formatUGX(w.amount)}</div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold capitalize ${w.status === 'pending' ? 'bg-amber-100 text-amber-700' : w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span>
                    </div>
                  </div>
                  <div className={`mx-4 mb-3 rounded-2xl p-3 ${isMTN ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 ${isMTN ? 'bg-yellow-400' : 'bg-red-500'}`}>{isMTN ? 'M' : 'A'}</div>
                        <div><div className={`text-xs font-black ${isMTN ? 'text-yellow-700' : 'text-red-700'}`}>{isMTN ? 'MTN Mobile Money' : 'Airtel Money'}</div><div className="text-gray-500 text-[10px]">Send payment to this number</div></div>
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMTN ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>{isMTN ? 'MTN' : 'Airtel'}</div>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 mb-2 shadow-sm">
                      <div><div className="text-gray-400 text-[10px] font-medium">WALLET NUMBER</div><div className="text-gray-900 font-black text-lg tracking-widest leading-tight">{w.walletPhone}</div></div>
                      <button onClick={() => { navigator.clipboard.writeText(w.walletPhone); toast.success('Phone number copied!'); }} className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold ${isMTN ? 'bg-yellow-400' : 'bg-red-500'}`}>COPY</button>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm">
                      <div><div className="text-gray-400 text-[10px] font-medium">ACCOUNT NAME</div><div className="text-gray-800 font-bold text-sm">{w.walletName}</div></div>
                      <button onClick={() => { navigator.clipboard.writeText(w.walletName); toast.success('Name copied!'); }} className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold">COPY</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 pb-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-1.5"><div className="text-green-500 text-[10px] font-medium">NET AMOUNT TO SEND</div><div className="text-green-700 font-black text-base">{formatUGX(w.netAmount)}</div></div>
                    <div className="text-right"><div className="text-gray-400 text-[10px]">Tax: {formatUGX(w.amount - w.netAmount)}</div><div className="text-gray-300 text-[10px]">{formatDateTime(w.createdAt)}</div></div>
                  </div>
                  {w.status === 'pending' && (
                    <div className="flex gap-2 px-4 pb-4">
                      <button onClick={() => approveWithdrawal(w.id)} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4" /> Approve & Mark Paid</button>
                      <button onClick={() => rejectWithdrawal(w.id)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1"><XCircle className="w-4 h-4" /> Reject</button>
                    </div>
                  )}
                  {w.status !== 'pending' && (
                    <div className="px-4 pb-4">
                      <div className={`text-center py-2 rounded-xl text-xs font-semibold ${w.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {w.status === 'approved' ? '✓ Payment sent & approved' : '✗ Rejected'}
                        {w.processedAt ? ` • ${formatDateTime(w.processedAt)}` : ''}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {withdrawals.length === 0 && <div className="text-center py-12 text-gray-400">No withdrawal requests</div>}
          </div>
        )}

        {/* ─── Recharges ─── */}
        {tab === 'recharges' && (
          <div className="space-y-3">
            {[...recharges].reverse().map((r) => {
              const user = users.find((u) => u.id === r.userId);
              return (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="font-bold text-gray-800">{formatUGX(r.amount)}</div><div className="text-gray-500 text-xs">{user?.name || r.userName} • {user?.phone || r.userPhone}</div></div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                  </div>
                  <div className="text-gray-500 text-xs mb-1">{r.network === 'mtn' ? '📲 MTN' : '📱 Airtel'} from {r.senderPhone}</div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 mb-3">{r.proof}</div>
                  <div className="text-gray-300 text-xs mb-3">{formatDateTime(r.createdAt)}</div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => approveRecharge(r.id)} className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold">✓ Approve</button>
                      <button onClick={() => rejectRecharge(r.id)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold">✗ Reject</button>
                    </div>
                  )}
                </div>
              );
            })}
            {recharges.length === 0 && <div className="text-center py-12 text-gray-400">No recharge requests</div>}
            
            {recharges.length === 0 && <div className="text-center py-12 text-gray-400">No recharge requests</div>}
            </div>
        )}

        {/* ─── Users ─── */}
        {tab === 'users' && (
          <div className="space-y-3">
            <button onClick={handleExportUsersCSV} className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors active:scale-95">
              <Download className="w-4 h-4" /> Export All Users CSV ({users.length})
            </button>
            <div className="space-y-2">
              <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search by name or phone..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none bg-white" />
              <div className="flex gap-2">
                {(['all', 'active', 'frozen'] as const).map((f) => (
                  <button key={f} onClick={() => setUserFilter(f)} className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${userFilter === f ? f === 'frozen' ? 'bg-red-500 text-white' : f === 'active' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {f === 'all' ? `All (${users.length})` : f === 'frozen' ? `🔒 Frozen (${users.filter(u => !!u.frozen).length})` : `✅ Active (${users.filter(u => !u.frozen).length})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">{users.length === 0 ? 'No users yet' : 'No users match your search'}</div>
            ) : (
              filteredUsers.map((u) => {
                const referrer = u.referredBy ? users.find((x) => x.id === u.referredBy) : null;
                const userProds = products.filter((p) => p.userId === u.id);
                const totalInvested = userProds.reduce((s, p) => s + p.packagePrice, 0);
                const directReferrals = users.filter((x) => x.referredBy === u.id);
                return (
                  <div key={u.id} className={`rounded-2xl p-4 shadow-sm ${u.frozen ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-gray-800">{u.name}</div>
                          {u.frozen && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> FROZEN</span>}
                        </div>
                        <div className="text-gray-500 text-xs">{u.phone}</div>
                        <div className="text-blue-500 text-xs font-medium">Code: {u.referralCode}</div>
                      </div>
                      <div className="text-right"><div className="text-blue-600 font-bold">{formatUGX(u.balance)}</div><div className="text-gray-400 text-xs">balance</div></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-50 rounded-lg p-2 text-center"><div className="text-gray-400">Invested</div><div className="font-bold text-gray-700">{formatUGX(totalInvested)}</div></div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center"><div className="text-gray-400">Team</div><div className="font-bold text-gray-700">{directReferrals.length} direct</div></div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center"><div className="text-gray-400">Earnings</div><div className="font-bold text-green-600">{formatUGX(u.totalEarnings)}</div></div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <span className="text-amber-600 text-xs font-medium">Referral Code:</span>
                      <span className="text-amber-700 font-black text-sm tracking-widest flex-1">{u.referralCode}</span>
                      <button onClick={() => { navigator.clipboard.writeText(u.referralCode); toast.success('Code copied!'); }} className="bg-amber-500 text-white text-[10px] px-2 py-1 rounded-lg font-bold">COPY</button>
                    </div>
                    {referrer && <div className="mt-2 text-xs text-gray-400">Referred by: <span className="text-blue-500">{referrer.name} ({referrer.phone})</span></div>}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setAdjustUser(u)} className="flex-1 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Adjust Balance</button>
                      <button onClick={() => handleFreezeToggle(u.id, !!u.frozen)} className={`flex-1 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${u.frozen ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {u.frozen ? <><Unlock className="w-3.5 h-3.5" /> Unfreeze</> : <><Lock className="w-3.5 h-3.5" /> Freeze</>}
                      </button>
                    </div>
                    <button onClick={() => setDeleteUserTarget(u)} className="mt-2 w-full py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete User
                    </button>

                    {/* Referral Tree */}
                    {(() => {
                      const l1List = users.filter((x) => x.referredBy === u.id);
                      if (l1List.length === 0) return null;
                      const isOpen = expandedTrees.has(u.id);
                      return (
                        <div className="mt-2">
                          <button onClick={() => toggleTree(u.id)} className="w-full py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors hover:bg-indigo-100">
                            <GitBranch className="w-3.5 h-3.5" />
                            {isOpen ? 'Hide' : 'View'} Referral Tree ({l1List.length} direct)
                            <span className={`ml-auto mr-2 text-indigo-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                          </button>
                          {isOpen && (
                            <div className="mt-2 rounded-2xl border border-indigo-100 overflow-hidden">
                              <div className="bg-indigo-600 px-3 py-2 flex items-center gap-2">
                                <GitBranch className="w-3.5 h-3.5 text-white" />
                                <span className="text-white text-xs font-bold">{u.name}&apos;s Referral Network</span>
                              </div>
                              <div className="bg-white divide-y divide-indigo-50">
                                {l1List.map((l1, l1Idx) => {
                                  const l1Invested = products.filter((p) => p.userId === l1.id).reduce((s, p) => s + p.packagePrice, 0);
                                  const l2List = users.filter((x) => x.referredBy === l1.id);
                                  return (
                                    <div key={l1.id}>
                                      <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black shrink-0">{l1Idx + 1}</div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5"><span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">L1</span><span className="text-gray-800 text-xs font-bold truncate">{l1.name}</span></div>
                                          <div className="text-gray-400 text-[10px]">{l1.phone}</div>
                                        </div>
                                        <div className="text-right shrink-0"><div className="text-green-600 text-xs font-bold">{formatUGX(l1Invested)}</div><div className="text-gray-300 text-[9px]">invested</div></div>
                                      </div>
                                      {l2List.map((l2) => {
                                        const l2Invested = products.filter((p) => p.userId === l2.id).reduce((s, p) => s + p.packagePrice, 0);
                                        const l3List = users.filter((x) => x.referredBy === l2.id);
                                        return (
                                          <Fragment key={l2.id}>
                                            <div className="flex items-center gap-2 px-3 py-2 pl-8 border-t border-indigo-50 bg-white">
                                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5"><span className="bg-purple-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">L2</span><span className="text-gray-700 text-[11px] font-semibold truncate">{l2.name}</span></div>
                                                <div className="text-gray-400 text-[10px]">{l2.phone}</div>
                                              </div>
                                              <div className="text-right shrink-0"><div className="text-green-500 text-[11px] font-bold">{formatUGX(l2Invested)}</div><div className="text-gray-300 text-[9px]">invested</div></div>
                                            </div>
                                            {l3List.map((l3) => {
                                              const l3Invested = products.filter((p) => p.userId === l3.id).reduce((s, p) => s + p.packagePrice, 0);
                                              return (
                                                <div key={l3.id} className="flex items-center gap-2 px-3 py-2 border-t border-indigo-50" style={{ paddingLeft: '3rem' }}>
                                                  <div className="w-1 h-1 rounded-full bg-pink-300 shrink-0" />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5"><span className="bg-pink-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">L3</span><span className="text-gray-600 text-[11px] font-medium truncate">{l3.name}</span></div>
                                                    <div className="text-gray-400 text-[10px]">{l3.phone}</div>
                                                  </div>
                                                  <div className="text-right shrink-0"><div className="text-green-400 text-[11px] font-bold">{formatUGX(l3Invested)}</div><div className="text-gray-300 text-[9px]">invested</div></div>
                                                </div>
                                              );
                                            })}
                                          </Fragment>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                                {(() => {
                                  const l2Members = l1List.flatMap((l1) => users.filter((x) => x.referredBy === l1.id));
                                  const l3Members = l2Members.flatMap((l2) => users.filter((x) => x.referredBy === l2.id));
                                  const allMembers = [...l1List, ...l2Members, ...l3Members];
                                  const teamTotal = allMembers.reduce((s, m) => s + products.filter((p) => p.userId === m.id).reduce((ps, p) => ps + p.packagePrice, 0), 0);
                                  return (
                                    <div className="px-3 py-2.5 bg-indigo-50 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 text-[10px] font-semibold">
                                        <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded-full">{l1List.length} L1</span>
                                        <span className="bg-purple-400 text-white px-1.5 py-0.5 rounded-full">{l2Members.length} L2</span>
                                        <span className="bg-pink-400 text-white px-1.5 py-0.5 rounded-full">{l3Members.length} L3</span>
                                      </div>
                                      <div className="text-indigo-700 text-[10px] font-bold shrink-0">Team: {formatUGX(teamTotal)}</div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Delete User Modal ─── */}
        {deleteUserTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => !deletingUser && setDeleteUserTarget(null)}>
            <div className="w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center mb-4"><div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center"><AlertTriangle className="w-8 h-8 text-red-500" /></div></div>
              <h3 className="text-gray-900 font-bold text-lg text-center mb-1">Delete User?</h3>
              <p className="text-gray-500 text-sm text-center mb-1"><span className="font-semibold text-gray-800">{deleteUserTarget.name}</span> • {deleteUserTarget.phone}</p>
              <p className="text-red-500 text-xs text-center mb-5 leading-relaxed">This will permanently delete the user account and ALL associated data. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteUserTarget(null)} disabled={deletingUser} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm disabled:opacity-50">Cancel</button>
                <button onClick={handleDeleteUser} disabled={deletingUser} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {deletingUser ? 'Deleting...' : <><Trash2 className="w-4 h-4" /> Delete</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Balance Adjustment Modal ─── */}
        {adjustUser && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setAdjustUser(null)}>
            <div className="w-full max-w-[430px] bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
              <div className="text-gray-800 font-bold text-base mb-1">Adjust Balance</div>
              <div className="text-gray-500 text-xs mb-4">{adjustUser.name} • {adjustUser.phone} • Current: <span className="font-bold text-blue-600">{formatUGX(adjustUser.balance)}</span></div>
              <div className="bg-gray-100 rounded-2xl p-1 flex mb-4">
                <button onClick={() => setAdjustType('add')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${adjustType === 'add' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500'}`}>＋ Add</button>
                <button onClick={() => setAdjustType('deduct')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${adjustType === 'deduct' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500'}`}>－ Deduct</button>
              </div>
              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Amount (UGX)</label>
                <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Enter amount" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base outline-none bg-gray-50" />
                {adjustAmount && parseInt(adjustAmount) > 0 && (
                  <div className={`mt-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${adjustType === 'add' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    New balance: {formatUGX(adjustType === 'add' ? adjustUser.balance + parseInt(adjustAmount) : Math.max(0, adjustUser.balance - parseInt(adjustAmount)))}
                  </div>
                )}
              </div>
              <div className="mb-5">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Reason / Note</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Bonus, correction, refund..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm outline-none bg-gray-50" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAdjustUser(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Cancel</button>
                <button onClick={handleAdjustBalance} disabled={adjusting} className={`flex-1 py-3 rounded-xl text-white font-bold text-sm ${adjustType === 'add' ? 'bg-green-500' : 'bg-red-500'} disabled:opacity-60`}>
                  {adjusting ? 'Processing...' : adjustType === 'add' ? '＋ Add Balance' : '－ Deduct Balance'}
                </button>
              </div>
            </div>
            </div>
        )}

        {/* ─── Broadcast ─── */}
        {tab === 'broadcast' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Bell className="w-5 h-5 text-blue-500" /><span className="font-bold text-gray-800 text-base">Broadcast Notification</span></div>
              <p className="text-gray-400 text-xs mb-4">Send a message to all {users.length} registered users at once.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Notification Title</label>
                  <input type="text" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="e.g. Platform Update, New Offer..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Message</label>
                  <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} placeholder="Write your message to all users here..." rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none bg-gray-50 resize-none" />
                </div>
              </div>
              {broadcastTitle && broadcastMsg && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <div className="text-blue-700 text-xs font-bold mb-1">Preview:</div>
                  <div className="text-blue-800 text-sm font-semibold">{broadcastTitle}</div>
                  <div className="text-blue-600 text-xs mt-0.5">{broadcastMsg}</div>
                </div>
              )}
              <button onClick={handleBroadcast} disabled={broadcasting || !broadcastTitle.trim() || !broadcastMsg.trim()} className="w-full mt-4 py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                {broadcasting ? (<span className="flex items-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" /><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" /></svg>Sending...</span>) : (<><Send className="w-4 h-4" /> Send to All {users.length} Users</>)}
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-amber-700 text-xs font-bold mb-1">⚠️ Admin Note</p>
              <p className="text-amber-600 text-xs leading-relaxed">Broadcasts are delivered instantly to all users&apos; notification inbox. Use this for platform announcements, promotions, and important updates.</p>
            </div>
          </div>
        )}

        {/* ─── Scheduler ─── */}
        {tab === 'scheduler' && (
          <div className="space-y-4 pb-6">
            {/* Status Card */}
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #0a0f2e, #1d4ed8)' }}>
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-base">Daily Income Scheduler</div>
                    <div className="text-blue-200 text-xs mt-0.5">Runs automatically every day at midnight Uganda time</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="text-blue-200 text-[10px] font-medium uppercase tracking-wide">Schedule</div>
                    <div className="text-white font-bold text-sm mt-0.5">Daily 00:00 EAT</div>
                    <div className="text-blue-300 text-[10px]">21:00 UTC</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="text-blue-200 text-[10px] font-medium uppercase tracking-wide">Active Packages</div>
                    <div className="text-white font-bold text-sm mt-0.5">{products.filter(p => p.status === 'active').length}</div>
                    <div className="text-blue-300 text-[10px]">eligible for income</div>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 mb-4">
                  <div className="text-blue-100 text-xs font-semibold mb-1">How it works</div>
                  <ul className="space-y-1 text-blue-200 text-[11px]">
                    <li>• Edge Function triggers at 21:00 UTC (midnight Uganda)</li>
                    <li>• Iterates all active packages with 24-hour guard</li>
                    <li>• Credits daily income to each user&apos;s balance</li>
                    <li>• Sends notification to each user automatically</li>
                    <li>• Expires overdue packages automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="text-amber-800 font-bold text-sm mb-2">⚙️ Activate Auto-Schedule</div>
              <p className="text-amber-700 text-xs leading-relaxed mb-3">
                To enable fully automatic daily triggering, go to your <strong>OnSpace Cloud Dashboard → Edge Functions</strong>, select <code className="bg-amber-100 px-1 py-0.5 rounded">daily-income-scheduler</code>, and set a cron schedule of:
              </p>
              <div className="bg-white border border-amber-300 rounded-xl px-4 py-3 font-mono text-amber-800 text-sm font-bold tracking-wider text-center">
                0 21 * * *
              </div>
              <p className="text-amber-600 text-[10px] mt-2 text-center">= Every day at 21:00 UTC = Midnight Uganda time (EAT)</p>
            </div>

            {/* Manual Trigger */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <PlayCircle className="w-5 h-5 text-green-500" />
                <span className="font-bold text-gray-800 text-base">Manual Trigger</span>
              </div>
              <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                Manually invoke the Edge Function scheduler right now. Only packages not credited in the last 24 hours will receive income — safe to call any time.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-center">
                  <div className="text-green-600 font-bold text-base">{products.filter(p => p.status === 'active').length}</div>
                  <div className="text-green-500 text-[10px] font-medium">Active Packages</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-center">
                  <div className="text-blue-600 font-bold text-sm">{formatUGX(products.filter(p => p.status === 'active').reduce((s, p) => s + p.dailyIncome, 0))}</div>
                  <div className="text-blue-500 text-[10px] font-medium">Max Payout</div>
                </div>
              </div>
              <button
                onClick={handleTriggerScheduler}
                disabled={runningScheduler || products.filter(p => p.status === 'active').length === 0}
                className="w-full py-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
              >
                {runningScheduler
                  ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Running Scheduler...</>)
                  : (<><PlayCircle className="w-4 h-4" /> Trigger Daily Income Now</>)
                }
              </button>
            </div>

            {/* Last Run Result */}
            {schedulerLog && (
              <div className={`rounded-2xl p-4 ${schedulerLog.errors?.length ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className={`w-5 h-5 ${schedulerLog.errors?.length ? 'text-red-500' : 'text-green-500'}`} />
                  <span className={`font-bold text-sm ${schedulerLog.errors?.length ? 'text-red-700' : 'text-green-700'}`}>
                    Last Run Result
                  </span>
                  <span className="text-gray-400 text-xs ml-auto">{new Date(schedulerLog.ts).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className={`rounded-xl px-3 py-2 text-center ${schedulerLog.errors?.length ? 'bg-red-100' : 'bg-green-100'}`}>
                    <div className={`font-bold text-lg ${schedulerLog.errors?.length ? 'text-red-600' : 'text-green-600'}`}>{schedulerLog.credited}</div>
                    <div className="text-gray-500 text-[10px]">Packages Credited</div>
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-center ${schedulerLog.errors?.length ? 'bg-red-100' : 'bg-green-100'}`}>
                    <div className={`font-bold text-sm ${schedulerLog.errors?.length ? 'text-red-600' : 'text-green-600'}`}>{formatUGX(schedulerLog.total)}</div>
                    <div className="text-gray-500 text-[10px]">Total Distributed</div>
                  </div>
                </div>
                {schedulerLog.errors?.length ? (
                  <div className="bg-white rounded-xl p-3">
                    <div className="text-red-600 text-xs font-bold mb-1">Errors:</div>
                    {schedulerLog.errors.map((e, i) => <div key={i} className="text-red-500 text-xs">{e}</div>)}
                  </div>
                ) : (
                  <div className="text-green-600 text-xs font-medium text-center">✓ All packages processed successfully</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Missions ─── */}
        {tab === 'missions' && <MissionsAdmin users={users} products={products} />}

        {/* ─── Redeem Codes ─── */}
        {tab === 'redeem' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-semibold text-gray-800 text-sm mb-3">Create New Code</div>
              <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="Code (e.g. GIFT2024)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none uppercase mb-2" />
              <input type="number" value={newCodeAmount} onChange={(e) => setNewCodeAmount(e.target.value)} placeholder="Amount in UGX" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none mb-2" />
              <p className="text-gray-400 text-xs mb-3">⏰ Code expires after 15 minutes (Telegram gift)</p>
              <button onClick={handleCreateRedeemCode} className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Create Code</button>
            </div>
            {redeemCodes.map((c) => {
              const expired = new Date(c.expiresAt) < new Date();
              return (
                <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-purple-700 text-lg tracking-widest">{c.code}</div>
                      <div className="text-gray-600 text-sm font-medium">{formatUGX(c.amount)}</div>
                      <div className={`text-xs mt-1 ${expired ? 'text-red-500' : 'text-green-600'}`}>{expired ? '⏰ Expired' : `✅ Valid until ${new Date(c.expiresAt).toLocaleTimeString()}`}</div>
                      <div className="text-gray-400 text-xs">Used by {c.usedBy.length} people</div>
                    </div>
                    <button onClick={() => deleteRedeemCodeById(c.id).then(refresh)} className="text-red-400 p-2"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              );
            })}
            {redeemCodes.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No codes created yet</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
