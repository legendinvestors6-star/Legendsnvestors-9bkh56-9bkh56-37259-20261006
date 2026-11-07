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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  approvePasswordReset,
  approveWithdrawOrder,
  createGiftCode,
  deleteGiftCode,
  formatUGX,
  getGiftCodes,
  getPasswordResets,
  getTeamCommissions,
  getTeamMembers,
  getTransactions,
  getUserProducts,
  getUsers,
  getWithdrawOrders,
  rejectPasswordReset,
  rejectWithdrawOrder,
  setCurrentUser,
  updateUser,
} from '@/lib/storage';
import type { PasswordResetRequest } from '@/lib/storage';
import { PRODUCTS } from '@/constants/products';

type AdminTab =
  | 'pesajet'
  | 'overview'
  | 'users'
  | 'recharge'
  | 'withdraw'
  | 'products'
  | 'gifts'
  | 'resets';

type AdminUser = {
  id: string;
  phone: string;
  balance: number;
  cumulativeIncome: number;
  level: number;
  referralCode: string;
  createdAt?: string;
  isAdmin?: boolean;
  source: 'SUPABASE' | 'LOCAL';
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

const tabs: {
  key: AdminTab;
  label: string;
  icon: typeof Users;
}[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'pesajet', label: 'PesaJet', icon: DollarSign },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'recharge', label: 'Recharge', icon: CreditCard },
  { key: 'withdraw', label: 'Withdraw', icon: ArrowDownToLine },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'gifts', label: 'Redeem Code', icon: Gift },
  { key: 'resets', label: 'Resets', icon: Shield },
];

function getRechargeStatusStyle(statusValue: string | null | undefined) {
  const status = String(statusValue || 'unknown').toLowerCase();

  if (['completed', 'approved', 'paid', 'successful'].includes(status)) {
    return {
      label: 'COMPLETED',
      color: '#4ade80',
      background: 'rgba(74,222,128,0.12)',
    };
  }

  if (status === 'pending') {
    return {
      label: 'PENDING',
      color: '#fbbf24',
      background: 'rgba(251,191,36,0.12)',
    };
  }

  return {
    label: status.toUpperCase(),
    color: '#f87171',
    background: 'rgba(248,113,113,0.12)',
  };
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

function PesaJetTab({
  orders,
  loading,
  loadError,
  onRefresh,
}: {
  orders: RechargeOrder[];
  loading: boolean;
  loadError: string;
  onRefresh: () => void;
}) {
  const pendingCount = orders.filter(
    order => String(order.status).toLowerCase() === 'pending'
  ).length;

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, #1a1100, #2d1f00)',
          border: '1px solid rgba(201,168,76,0.4)',
        }}
      >
        <p className="text-white font-black text-sm">PesaJet Recharge Monitor</p>
        <p className="text-[#c9a84c] text-[11px] mt-1">
          {pendingCount} pending • {orders.length} total recharge records
        </p>
        <p className="text-gray-400 text-[11px] mt-1">
          Payment status and wallet credit are handled by the verified server callback.
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="w-full py-3 rounded-xl font-black text-black text-sm disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}
      >
        {loading ? 'Checking…' : 'Refresh PesaJet records'}
      </button>

      {loadError && (
        <div className="rounded-xl p-3 text-sm text-red-300 bg-red-950/30">
          {loadError}
        </div>
      )}

      {!loadError && !loading && orders.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: '#111', border: '1px dashed #333' }}
        >
          <p className="text-gray-400 text-sm">No recharge records found.</p>
        </div>
      )}

      {orders.map(order => {
        const status = getRechargeStatusStyle(order.status);

        return (
          <div
            key={order.id}
            className="rounded-2xl p-4"
            style={{
              background: '#111',
              border: '1px solid rgba(201,168,76,0.3)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-black">
                  {formatUGX(Number(order.amount || 0))}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {order.payment_method || 'PesaJet'} • {order.phone_number || 'No phone'}
                </p>
                <p className="text-gray-500 text-[10px] mt-1">
                  User: {String(order.user_id || '—').slice(0, 12)}
                </p>
                <p className="text-gray-500 text-[10px] mt-1 break-all">
                  Reference: {order.id}
                </p>
                {order.pesajet_id && (
                  <p className="text-gray-500 text-[10px] mt-1 break-all">
                    Provider transaction: {order.pesajet_id}
                  </p>
                )}
              </div>

              <span
                className="shrink-0 px-2 py-1 rounded-full text-[10px] font-black"
                style={{
                  color: status.color,
                  background: status.background,
                }}
              >
                {status.label}
              </span>
            </div>

            <p className="text-gray-600 text-[10px] mt-3">
              {formatDate(order.submitted_at || order.created_at)}
            </p>
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

  const loadAllFromSupabase = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    const [
      usersResult,
      rechargeResult,
      withdrawalsResult,
      productsResult,
    ] = await Promise.all([
      supabase
        .from('platform_users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),

      supabase
        .from('investment_packages')
        .select('*')
        .eq('product_name', 'RECHARGE')
        .order('submitted_at', { ascending: false })
        .limit(500),

      supabase
        .from('withdraw_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),

      supabase
        .from('user_products')
        .select('*')
        .order('purchase_date', { ascending: false })
        .limit(500),
    ]);

    if (usersResult.error) {
      console.error('Admin users load failed:', usersResult.error.message);
    }

    if (rechargeResult.error) {
      console.error('Admin recharge load failed:', rechargeResult.error.message);
      setLoadError(
        'Could not load recharge records. Check the investment_packages table and Supabase RLS policies.'
      );
    } else {
      setRechargeOrders((rechargeResult.data || []) as RechargeOrder[]);
    }

    if (withdrawalsResult.error) {
      console.error('Admin withdrawals load failed:', withdrawalsResult.error.message);
    } else {
      setSupaWithdraw(withdrawalsResult.data || []);
    }

    if (productsResult.error) {
      console.error('Admin products load failed:', productsResult.error.message);
    } else {
      setSupaProducts(productsResult.data || []);
    }

    const databaseUsers: AdminUser[] = (usersResult.data || []).map((user: any) => ({
      id: String(user.id),
      phone: String(user.phone || user.phone_number || user.mobile || ''),
      balance: Number(user.wallet_balance ?? user.balance ?? 0),
      cumulativeIncome: Number(
        user.cumulative_income ?? user.total_earnings ?? 0
      ),
      level: Number(user.level || 1),
      referralCode: String(
        user.referral_code ||
          user.own_referral_code ||
          String(user.id).slice(0, 6).toUpperCase()
      ),
      createdAt: user.created_at || undefined,
      isAdmin: false,
      source: 'SUPABASE',
      isBlocked: Boolean(user.is_blocked || user.is_banned),
    }));

    let mergedUsers = [...databaseUsers];

    try {
      const localUsers = getUsers()
        .filter(user => !user.isAdmin)
        .map((user: any): AdminUser => ({
          id: String(user.id),
          phone: String(user.phone || ''),
          balance: Number(user.balance || 0),
          cumulativeIncome: Number(user.cumulativeIncome || 0),
          level: Number(user.level || 1),
          referralCode: String(user.referralCode || 'N/A'),
          createdAt: user.createdAt,
          isAdmin: false,
          source: 'LOCAL',
          isBlocked: Boolean(user.isBlocked),
        }));

      for (const localUser of localUsers) {
        const duplicate = mergedUsers.some(
          user => user.id === localUser.id || user.phone === localUser.phone
        );

        if (!duplicate) mergedUsers.push(localUser);
      }
    } catch (error) {
      console.error('Could not load local users:', error);
    }

    setSupaUsers(mergedUsers);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAllFromSupabase();

    const timer = setInterval(() => {
      void loadAllFromSupabase();
    }, 15000);

    return () => clearInterval(timer);
  }, [loadAllFromSupabase, refresh]);

  const users =
    supaUsers.length > 0
      ? supaUsers
      : getUsers()
          .filter(user => !user.isAdmin)
          .map((user: any): AdminUser => ({
            id: String(user.id),
            phone: String(user.phone || ''),
            balance: Number(user.balance || 0),
            cumulativeIncome: Number(user.cumulativeIncome || 0),
            level: Number(user.level || 1),
            referralCode: String(user.referralCode || 'N/A'),
            createdAt: user.createdAt,
            isAdmin: false,
            source: 'LOCAL',
            isBlocked: Boolean(user.isBlocked),
          }));

  const localWithdrawals = getWithdrawOrders().map((order: any) => ({
    id: String(order.id),
    userId: String(order.userId || ''),
    amount: Number(order.amount || 0),
    phoneNumber: String(order.phoneNumber || ''),
    status: String(order.status || 'pending'),
    createdAt: order.createdAt,
    source: 'LOCAL',
  }));

  const databaseWithdrawals = supaWithdraw.map((order: any) => ({
    id: String(order.id),
    userId: String(order.user_id || ''),
    amount: Number(order.amount || 0),
    phoneNumber: String(order.phone_number || ''),
    status: String(order.status || 'pending'),
    createdAt: order.created_at,
    source: 'SUPABASE',
  }));

  const withdrawOrders = [...databaseWithdrawals, ...localWithdrawals];

  const localProducts = getUserProducts().map((product: any) => ({
    ...product,
    userId: String(product.userId || ''),
    productId: product.productId,
    product_id: product.product_id,
    productName: product.productName || product.product_name,
    price: product.price,
    dailyIncome: product.dailyIncome || product.daily_income,
    purchaseDate: product.purchaseDate || product.purchase_date,
    status: product.status,
    source: 'LOCAL',
  }));

  const databaseProducts = supaProducts.map((product: any) => ({
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

  const allUserProducts = [...databaseProducts, ...localProducts];
  const transactions = getTransactions();

  const pendingRechargeCount = rechargeOrders.filter(
    order => String(order.status).toLowerCase() === 'pending'
  ).length;

  const pendingWithdrawals = withdrawOrders.filter(
    order => String(order.status).toLowerCase() === 'pending'
  );

  const completedRechargeOrders = rechargeOrders.filter(order =>
    ['completed', 'approved', 'paid', 'successful'].includes(
      String(order.status).toLowerCase()
    )
  );

  const totalUsers = users.length;
  const activeProductsCount = allUserProducts.filter(
    product => String(product.status).toLowerCase() === 'active'
  ).length;
  const pendingPackages = pendingRechargeCount;

  const totalDeposits = completedRechargeOrders.reduce(
    (sum, order) => sum + Number(order.amount || 0),
    0
  );

  const totalWithdrawals = withdrawOrders
    .filter(order =>
      ['completed', 'approved'].includes(String(order.status).toLowerCase())
    )
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);

  const pendingPayouts = pendingWithdrawals.reduce(
    (sum, order) => sum + Number(order.amount || 0),
    0
  );

  const earningsDistributed = users.reduce(
    (sum, user) => sum + Number(user.cumulativeIncome || 0),
    0
  );

  const referralEarnings = earningsDistributed;

  const passwordResets = getPasswordResets();
  const pendingResetCount = passwordResets.filter(
    request => request.status === 'pending'
  ).length;

  const tabBadges: Partial<Record<AdminTab, number>> = {
    pesajet: pendingRechargeCount,
    users: users.length,
    recharge: pendingRechargeCount,
    withdraw: pendingWithdrawals.length,
    products: activeProductsCount,
    resets: pendingResetCount,
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const handleAddBalance = async (
    user: AdminUser,
    isDeduct = false
  ) => {
    const input = window.prompt(
      `${isDeduct ? 'Deduct from' : 'Add balance to'} ${user.phone} (UGX):`
    );

    if (input === null) return;

    const amount = Number.parseInt(input, 10);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast.error('Enter a valid positive amount.');
      return;
    }

    const delta = isDeduct ? -amount : amount;

    if (user.source === 'SUPABASE') {
      const newBalance = Math.max(0, Number(user.balance || 0) + delta);

      const { error } = await supabase
        .from('platform_users')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (error) {
        console.error('Could not update user wallet:', error.message);
        toast.error('Could not update this wallet.');
        return;
      }
    } else {
      try {
        updateUser(user.id, {
          balance: Math.max(0, Number(user.balance || 0) + delta),
        } as any);
      } catch (error) {
        console.error('Could not update local user wallet:', error);
        toast.error('Could not update this local wallet.');
        return;
      }
    }

    toast.success(
      `${isDeduct ? 'Deducted' : 'Added'} ${formatUGX(amount)} for ${user.phone}.`
    );
    setRefresh(value => value + 1);
  };

  const handleBlockUser = async (user: AdminUser) => {
    const shouldBlock = !user.isBlocked;

    if (!window.confirm(`${shouldBlock ? 'Block' : 'Unblock'} ${user.phone}?`)) {
      return;
    }

    if (user.source === 'SUPABASE') {
      const { error } = await supabase
        .from('platform_users')
        .update({
          is_blocked: shouldBlock,
          is_banned: shouldBlock,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Could not update user block status:', error.message);
        toast.error('Could not update user status.');
        return;
      }
    } else {
      try {
        updateUser(user.id, { isBlocked: shouldBlock } as any);
      } catch (error) {
        console.error('Could not update local user:', error);
        toast.error('Could not update user status.');
        return;
      }
    }

    toast.success(shouldBlock ? 'User blocked.' : 'User unblocked.');
    setRefresh(value => value + 1);
  };

  const handleWithdrawalDecision = async (
    order: (typeof withdrawOrders)[number],
    decision: 'approve' | 'reject'
  ) => {
    if (order.source === 'SUPABASE') {
      const nextStatus = decision === 'approve' ? 'approved' : 'rejected';

      const { error } = await supabase
        .from('withdraw_orders')
        .update({ status: nextStatus })
        .eq('id', order.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Could not update withdrawal:', error.message);
        toast.error('Could not update withdrawal.');
        return;
      }
    } else if (decision === 'approve') {
      approveWithdrawOrder(order.id);
    } else {
      rejectWithdrawOrder(order.id);
    }

    toast.success(
      decision === 'approve' ? 'Withdrawal approved.' : 'Withdrawal rejected.'
    );
    setRefresh(value => value + 1);
  };

  const handleCreateGiftCode = () => {
    const amount = Number.parseInt(
      window.prompt('Gift code amount in UGX:') || '',
      10
    );

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast.error('Enter a valid positive amount.');
      return;
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    try {
      createGiftCode(amount, undefined, expiresAt);
      toast.success('Redeem code created.');
      setRefresh(value => value + 1);
    } catch (error) {
      console.error('Could not create gift code:', error);
      toast.error('Could not create redeem code.');
    }
  };

  const filteredUsers = users.filter(user =>
    user.phone.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      <header
        className="flex items-center justify-between p-4"
        style={{
          background: 'linear-gradient(135deg, #000000, #1a1100)',
          borderBottom: '1px solid rgba(201,168,76,0.2)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}
          >
            <Shield size={18} className="text-black" />
          </div>
          <span className="text-white font-black">Admin Panel</span>
          <span
            className="hidden sm:inline text-[9px] font-black text-black px-2 py-0.5 rounded-full"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}
          >
            {totalUsers} USERS • {activeProductsCount} ACTIVE
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#111', border: '1px solid #2a2a2a' }}
        >
          <LogOut size={15} className="text-gray-400" />
        </button>
      </header>

      <nav
        className="flex overflow-x-auto"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
      >
        {tabs.map(item => {
          const Icon = item.icon;
          const badge = tabBadges[item.key] || 0;

          return (
            <button
              type="button"
              key={item.key}
              onClick={() => setTab(item.key)}
              className="relative flex flex-shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-bold"
              style={
                tab === item.key
                  ? { color: '#c9a84c', borderBottom: '2px solid #c9a84c' }
                  : { color: '#777' }
              }
            >
              <Icon size={13} />
              {item.label}
              {badge > 0 && (
                <span
                  className="absolute top-1 right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
                  }}
                >
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
            <button
              type="button"
              onClick={() => setRefresh(value => value + 1)}
              className="w-full py-2 rounded-xl text-xs text-[#c9a84c]"
              style={{
                background: '#111',
                border: '1px solid rgba(201,168,76,0.2)',
              }}
            >
              Refresh all devices • {totalUsers} users • {pendingRechargeCount} pending recharges
            </button>

            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Users size={20} className="text-white" />}
                iconBg="#2563eb"
                label="Total Users"
                value={String(totalUsers)}
                valueColor="#60a5fa"
              />
              <StatCard
                icon={<Package size={20} className="text-white" />}
                iconBg="#16a34a"
                label="Active Products"
                value={String(activeProductsCount)}
                valueColor="#4ade80"
              />
              <StatCard
                icon={<Clock size={20} className="text-white" />}
                iconBg="#d97706"
                label="Pending Recharges"
                value={String(pendingPackages)}
                valueColor="#fb923c"
              />
              <StatCard
                icon={<TrendingUp size={20} className="text-white" />}
                iconBg="#7c3aed"
                label="Completed Deposits"
                value={formatUGX(totalDeposits)}
                valueColor="#c084fc"
              />
              <StatCard
                icon={<ArrowDownToLine size={20} className="text-white" />}
                iconBg="#dc2626"
                label="Total Withdrawals"
                value={formatUGX(totalWithdrawals)}
                valueColor="#f87171"
              />
              <StatCard
                icon={<Wallet size={20} className="text-white" />}
                iconBg="#ea580c"
                label="Pending Payouts"
                value={formatUGX(pendingPayouts)}
                valueColor="#fb923c"
              />
              <StatCard
                icon={<TrendingUp size={20} className="text-white" />}
                iconBg="#0d9488"
                label="Earnings Distributed"
                value={formatUGX(earningsDistributed)}
                valueColor="#2dd4bf"
              />
              <StatCard
                icon={<UserCheck size={20} className="text-white" />}
                iconBg="#db2777"
                label="Referral Earnings"
                value={formatUGX(referralEarnings)}
                valueColor="#f472b6"
              />
            </div>
          </div>
        )}

        {tab === 'pesajet' && (
          <PesaJetTab
            orders={rechargeOrders}
            loading={loading}
            loadError={loadError}
            onRefresh={() => void loadAllFromSupabase()}
          />
        )}

        {tab === 'users' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setRefresh(value => value + 1)}
              className="w-full py-2.5 rounded-xl font-black text-black text-xs"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
              }}
            >
              Refresh users ({users.length})
            </button>

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: '#111', border: '1px solid #2a2a2a' }}
            >
              <Search size={14} className="text-gray-500" />
              <input
                value={searchQ}
                onChange={event => setSearchQ(event.target.value)}
                placeholder="Search by phone number"
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
              />
            </div>

            {filteredUsers.map(user => {
              const userRecharges = rechargeOrders.filter(
                order =>
                  order.user_id === user.id ||
                  Boolean(
                    order.phone_number &&
                      order.phone_number.replace(/\D/g, '').slice(-9) ===
                        user.phone.replace(/\D/g, '').slice(-9)
                  )
              );

              const userDeposits = userRecharges.filter(order =>
                ['completed', 'approved', 'paid', 'successful'].includes(
                  String(order.status).toLowerCase()
                )
              );

              const depositedAmount = userDeposits.reduce(
                (sum, order) => sum + Number(order.amount || 0),
                0
              );

              const userWithdrawals = withdrawOrders.filter(
                order =>
                  order.userId === user.id ||
                  (order.phoneNumber &&
                    order.phoneNumber.replace(/\D/g, '').slice(-9) ===
                      user.phone.replace(/\D/g, '').slice(-9))
              );

              const withdrawnAmount = userWithdrawals
                .filter(order =>
                  ['completed', 'approved'].includes(
                    String(order.status).toLowerCase()
                  )
                )
                .reduce((sum, order) => sum + Number(order.amount || 0), 0);

              const pendingUserWithdrawals = userWithdrawals.filter(
                order => String(order.status).toLowerCase() === 'pending'
              ).length;

              const userProducts = allUserProducts.filter(
                product => product.userId === user.id
              );

              const activeUserProducts = userProducts.filter(
                product => String(product.status).toLowerCase() === 'active'
              ).length;

              const expiredUserProducts = userProducts.filter(
                product => String(product.status).toLowerCase() === 'expired'
              ).length;

              const team = getTeamMembers(user.id);
              const commissions = getTeamCommissions(user.id);
              const referralTotal =
                Number(commissions.level1 || 0) +
                Number(commissions.level2 || 0) +
                Number(commissions.level3 || 0);

              const sevenDayEarnings = transactions
                .filter(
                  transaction =>
                    String((transaction as any).userId) === user.id &&
                    (transaction as any).type === 'daily-income' &&
                    new Date((transaction as any).createdAt).getTime() >
                      Date.now() - 7 * 24 * 60 * 60 * 1000
                )
                .reduce(
                  (sum, transaction) =>
                    sum + Number((transaction as any).amount || 0),
                  0
                );

              return (
                <section
                  key={user.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: '#111',
                    border: '1px solid rgba(201,168,76,0.3)',
                  }}
                >
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
                        }}
                      >
                        <span className="text-black font-black text-sm">
                          {user.phone.slice(-2) || '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-black text-base break-all">
                          {user.phone || 'No phone'}{' '}
                          <span
                            className={
                              user.source === 'SUPABASE'
                                ? 'text-[9px] text-green-400'
                                : 'text-[9px] text-yellow-400'
                            }
                          >
                            • {user.source}
                          </span>
                        </p>
                        <p className="text-gray-500 text-[11px]">
                          Lv{user.level} • #{user.referralCode} • Member since{' '}
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString('en-GB')
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <span
                      className="text-[11px] font-black text-black px-3 py-1 rounded-full shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
                      }}
                    >
                      Lv {user.level}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <InfoCard
                      label="Current Balance"
                      value={formatUGX(user.balance)}
                      color="#c9a84c"
                    />
                    <InfoCard
                      label="Cumulative Income"
                      value={formatUGX(user.cumulativeIncome)}
                      color="#fff"
                    />
                    <InfoCard
                      label="Completed Deposits"
                      value={formatUGX(depositedAmount)}
                      detail={`${userDeposits.length} completed recharges`}
                      color="#60a5fa"
                    />
                    <InfoCard
                      label="Withdrawn"
                      value={formatUGX(withdrawnAmount)}
                      detail={`${pendingUserWithdrawals} pending`}
                      color="#f87171"
                    />
                    <InfoCard
                      label="Active Products"
                      value={String(activeUserProducts)}
                      detail={`${expiredUserProducts} expired • ${userProducts.length} total`}
                      color="#4ade80"
                    />
                    <InfoCard
                      label="Referral Earnings"
                      value={formatUGX(referralTotal)}
                      detail="Across all levels"
                      color="#f472b6"
                    />
                    <InfoCard
                      label="7-Day Earnings"
                      value={formatUGX(sevenDayEarnings)}
                      color="#2dd4bf"
                    />
                  </div>

                  <div
                    className="rounded-xl p-3 mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #1a1100, #0f0f0f)',
                      border: '1px solid rgba(201,168,76,0.3)',
                    }}
                  >
                    <p className="text-[#c9a84c] font-black text-xs mb-2">
                      Team Referral
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[#60a5fa] font-black">
                          {team.level1.length}
                        </p>
                        <p className="text-gray-400 text-[9px]">Level 1</p>
                        <p className="text-[#c9a84c] text-[10px]">
                          {formatUGX(commissions.level1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#4ade80] font-black">
                          {team.level2.length}
                        </p>
                        <p className="text-gray-400 text-[9px]">Level 2</p>
                        <p className="text-[#c9a84c] text-[10px]">
                          {formatUGX(commissions.level2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#fb923c] font-black">
                          {team.level3.length}
                        </p>
                        <p className="text-gray-400 text-[9px]">Level 3</p>
                        <p className="text-[#c9a84c] text-[10px]">
                          {formatUGX(commissions.level3)}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-500 text-[10px] mt-2">
                      {team.level1.length + team.level2.length + team.level3.length}{' '}
                      team members
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAddBalance(user, false)}
                      className="py-3 rounded-xl text-xs font-black text-black"
                      style={{
                        background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
                      }}
                    >
                      + Add Balance
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAddBalance(user, true)}
                      className="py-3 rounded-xl text-xs font-bold text-gray-300"
                      style={{
                        background: '#1e1e1e',
                        border: '1px solid #2a2a2a',
                      }}
                    >
                      − Deduct
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBlockUser(user)}
                      className="py-3 rounded-xl text-xs font-bold text-red-400"
                      style={{ background: 'rgba(239,68,68,0.15)' }}
                    >
                      {user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </div>
                </section>
              );
            })}

            {filteredUsers.length === 0 && (
              <div
                className="rounded-2xl p-10 text-center"
                style={{ background: '#111', border: '1px dashed #333' }}
              >
                <p className="text-gray-400 text-sm">No matching users found.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'recharge' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void loadAllFromSupabase()}
              className="w-full py-2 rounded-xl text-xs text-[#c9a84c]"
              style={{
                background: '#111',
                border: '1px solid rgba(201,168,76,0.2)',
              }}
            >
              Refresh recharge records ({pendingRechargeCount} pending •{' '}
              {rechargeOrders.length} total)
            </button>

            {rechargeOrders.map(order => {
              const status = getRechargeStatusStyle(order.status);

              return (
                <div
                  key={order.id}
                  className="rounded-2xl p-4"
                  style={{ background: '#111', border: '1px solid #2a2a2a' }}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-white font-bold">
                        {formatUGX(Number(order.amount || 0))}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {order.phone_number || 'No phone'} •{' '}
                        {order.payment_method || 'PesaJet'}
                      </p>
                      <p className="text-gray-500 text-[10px] mt-1 break-all">
                        Ref: {order.id}
                      </p>
                    </div>
                    <span
                      className="h-fit px-2 py-1 rounded-full text-[10px] font-black"
                      style={{
                        color: status.color,
                        background: status.background,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-gray-600 text-[10px] mt-3">
                    {formatDate(order.submitted_at || order.created_at)}
                  </p>
                </div>
              );
            })}

            {rechargeOrders.length === 0 && !loading && (
              <div
                className="rounded-2xl p-10 text-center"
                style={{ background: '#111', border: '1px dashed #333' }}
              >
                <p className="text-gray-400 text-sm">No recharge records found.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'withdraw' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void loadAllFromSupabase()}
              className="w-full py-2 rounded-xl text-xs text-[#c9a84c]"
              style={{
                background: '#111',
                border: '1px solid rgba(201,168,76,0.2)',
              }}
            >
              Refresh withdrawals ({withdrawOrders.length})
            </button>

            {withdrawOrders.map(order => {
              const user = users.find(
                item =>
                  item.id === order.userId ||
                  item.phone === order.phoneNumber
              );

              return (
                <div
                  key={`${order.source}-${order.id}`}
                  className="rounded-2xl p-4"
                  style={{ background: '#111', border: '1px solid #2a2a2a' }}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-white font-bold">
                        {formatUGX(order.amount)} • {order.source}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {user?.phone || order.userId || 'Unknown user'} •{' '}
                        {order.phoneNumber || 'No phone'}
                      </p>
                    </div>
                    <span
                      className="h-fit px-2 py-1 rounded-full text-[10px]"
                      style={getGeneralStatusStyle(order.status)}
                    >
                      {order.status}
                    </span>
                  </div>

                  {order.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          void handleWithdrawalDecision(order, 'approve')
                        }
                        className="py-2.5 rounded-xl text-xs font-black text-black"
                        style={{
                          background:
                            'linear-gradient(135deg, #c9a84c, #f0c040)',
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleWithdrawalDecision(order, 'reject')
                        }
                        className="py-2.5 rounded-xl text-xs font-bold text-red-400"
                        style={{ background: 'rgba(239,68,68,0.1)' }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {withdrawOrders.length === 0 && (
              <div
                className="rounded-2xl p-10 text-center"
                style={{ background: '#111', border: '1px dashed #333' }}
              >
                <p className="text-gray-400 text-sm">No withdrawals found.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'products' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void loadAllFromSupabase()}
              className="w-full py-2 rounded-xl text-xs text-[#c9a84c]"
              style={{
                background: '#111',
                border: '1px solid rgba(201,168,76,0.2)',
              }}
            >
              Refresh products ({allUserProducts.length} purchases)
            </button>

            {PRODUCTS.map(product => {
              const purchases = allUserProducts.filter(
                item =>
                  item.productId === product.id ||
                  item.product_id === product.id
              );

              return (
                <div
                  key={product.id}
                  className="rounded-2xl p-4"
                  style={{ background: '#111', border: '1px solid #2a2a2a' }}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        VIP{product.vip} {product.name}
                      </p>
                      <p className="text-[#c9a84c] font-bold">
                        {formatUGX(product.price)} • Daily{' '}
                        {formatUGX(product.dailyIncome)}
                      </p>
                      <p className="text-gray-500 text-[10px]">
                        {purchases.length} purchases •{' '}
                        {
                          purchases.filter(
                            item =>
                              String(item.status).toLowerCase() === 'active'
                          ).length
                        }{' '}
                        active
                      </p>
                    </div>
                    <p className="text-white font-black text-xl">
                      {purchases.length}
                    </p>
                  </div>

                  {purchases.slice(0, 3).map((purchase: any) => (
                    <p
                      key={`${purchase.source}-${purchase.id}`}
                      className="text-gray-600 text-[10px] mt-2"
                    >
                      •{' '}
                      {users.find(user => user.id === purchase.userId)?.phone ||
                        String(purchase.userId || '').slice(0, 8)}{' '}
                      — {formatDate(purchase.purchaseDate)} — {purchase.source}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'gifts' && (
          <div className="space-y-3">
            <div
              className="rounded-2xl p-4"
              style={{
                background: '#111',
                border: '1px solid rgba(201,168,76,0.3)',
              }}
            >
              <p className="text-white font-bold text-sm mb-3">
                Create Redeem Code
              </p>
              <button
                type="button"
                onClick={handleCreateGiftCode}
                className="w-full py-3 rounded-xl font-black text-black"
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
                }}
              >
                + Create Redeem Code
              </button>
            </div>

            {getGiftCodes().map((giftCode: any) => (
              <div
                key={giftCode.id}
                className="rounded-xl p-3 flex justify-between items-center"
                style={{ background: '#111', border: '1px solid #2a2a2a' }}
              >
                <div>
                  <p className="text-[#c9a84c] font-black text-sm">
                    {giftCode.code}
                  </p>
                  <p className="text-white text-xs">
                    {formatUGX(giftCode.amount)}
                    {giftCode.usedBy ? ' • USED' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete redeem code ${giftCode.code}`}
                  onClick={() => {
                    if (!window.confirm(`Delete code ${giftCode.code}?`)) return;
                    deleteGiftCode(giftCode.id);
                    toast.success('Redeem code deleted.');
                    setRefresh(value => value + 1);
                  }}
                  className="w-8 h-8 rounded flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.1)' }}
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'resets' && (
          <div className="space-y-3">
            {passwordResets.map((request: PasswordResetRequest) => (
              <div
                key={request.id}
                className="rounded-2xl p-4"
                style={{ background: '#111', border: '1px solid #2a2a2a' }}
              >
                <div className="flex justify-between mb-2">
                  <p className="text-white font-bold text-sm">{request.phone}</p>
                  <span
                    className="px-2 py-1 rounded-full text-[10px]"
                    style={getGeneralStatusStyle(request.status)}
                  >
                    {request.status}
                  </span>
                </div>

                {request.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        approvePasswordReset(request.id);
                        toast.success('Password reset approved.');
                        setRefresh(value => value + 1);
                      }}
                      className="py-2 rounded-xl text-xs font-black text-black"
                      style={{
                        background:
                          'linear-gradient(135deg, #c9a84c, #f0c040)',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        rejectPasswordReset(request.id);
                        toast.success('Password reset rejected.');
                        setRefresh(value => value + 1);
                      }}
                      className="py-2 rounded-xl text-xs font-bold text-red-400"
                      style={{ background: 'rgba(239,68,68,0.1)' }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}

            {passwordResets.length === 0 && (
              <div
                className="rounded-2xl p-10 text-center"
                style={{ background: '#111', border: '1px dashed #333' }}
              >
                <p className="text-gray-400 text-sm">No password reset requests.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: '#111827', border: '1px solid #1f2937' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <p className="text-gray-400 text-[12px]">{label}</p>
      <p className="font-black text-sm mt-1" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: '#0f1419', border: '1px solid #1e293b' }}
    >
      <p className="text-gray-500 text-[10px] uppercase">{label}</p>
      <p className="font-black text-sm mt-1" style={{ color }}>
        {value}
      </p>
      {detail && <p className="text-gray-600 text-[10px] mt-1">{detail}</p>}
    </div>
  );
  }
