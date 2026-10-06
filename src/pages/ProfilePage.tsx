import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, Eye, EyeOff, CheckCircle, TrendingUp, ArrowDownToLine, Package, Users, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCurrentUser, updateUser, getRechargeOrders, getWithdrawOrders,
  getUserProducts, getTeamCommissions, getTransactions, formatUGX
} from '@/lib/storage';

export default function ProfilePage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!currentUser) { navigate('/'); return null; }

  // Compute 7-day income chart data
  const chartData = useMemo(() => {
    const txs = getTransactions(currentUser.id).filter(t => t.type === 'income');
    const days: { date: string; label: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const label = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const amount = txs
        .filter(t => new Date(t.createdAt).toDateString() === dateStr)
        .reduce((s, t) => s + t.amount, 0);
      days.push({ date: dateStr, label, amount });
    }
    return days;
  }, [currentUser.id]);

  const maxIncome = Math.max(...chartData.map(d => d.amount), 1);

  // Compute stats
  const stats = useMemo(() => {
    const recharges = getRechargeOrders(currentUser.id);
    const withdrawals = getWithdrawOrders(currentUser.id);
    const products = getUserProducts(currentUser.id);
    const commissions = getTeamCommissions(currentUser.id);

    const totalDeposited = recharges
      .filter(r => r.status === 'completed')
      .reduce((s, r) => s + r.amount, 0);

    const totalWithdrawn = withdrawals
      .filter(w => w.status === 'completed')
      .reduce((s, w) => s + w.amount, 0);

    const activeProductsCount = products.filter(p => p.status === 'active').length;
    const expiredProductsCount = products.filter(p => p.status === 'expired').length;

    const totalReferralEarnings = commissions.level1 + commissions.level2 + commissions.level3;

    return {
      totalDeposited,
      totalWithdrawn,
      activeProductsCount,
      expiredProductsCount,
      totalReferralEarnings,
      commissions,
      totalProducts: products.length,
      pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
    };
  }, [currentUser.id]);

  const handlePasswordUpdate = () => {
    if (!oldPassword) { toast.error('Enter your current password'); return; }
    if (oldPassword !== currentUser.password) { toast.error('Current password is incorrect'); return; }
    if (!newPassword || newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    if (newPassword === oldPassword) { toast.error('New password must differ from current password'); return; }

    setSaving(true);
    setTimeout(() => {
      updateUser(currentUser.id, { password: newPassword });
      toast.success('Password updated successfully');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setSaving(false);
    }, 600);
  };

  const passwordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (!pwd) return { label: '', color: '#333', width: '0%' };
    if (pwd.length < 6) return { label: 'Too short', color: '#ef4444', width: '25%' };
    if (pwd.length < 8) return { label: 'Weak', color: '#f59e0b', width: '50%' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { label: 'Strong', color: '#22c55e', width: '100%' };
    return { label: 'Medium', color: '#c9a84c', width: '75%' };
  };

  const strength = passwordStrength(newPassword);

  const statCards = [
    {
      icon: CreditCard,
      label: 'Total Deposited',
      value: formatUGX(stats.totalDeposited),
      sub: 'Approved recharges',
      color: '#c9a84c',
      bg: 'rgba(201,168,76,0.08)',
      border: 'rgba(201,168,76,0.25)',
    },
    {
      icon: ArrowDownToLine,
      label: 'Total Withdrawn',
      value: formatUGX(stats.totalWithdrawn),
      sub: `${stats.pendingWithdrawals} pending`,
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.08)',
      border: 'rgba(96,165,250,0.2)',
    },
    {
      icon: Package,
      label: 'Active Products',
      value: stats.activeProductsCount.toString(),
      sub: `${stats.expiredProductsCount} expired · ${stats.totalProducts} total`,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.08)',
      border: 'rgba(52,211,153,0.2)',
    },
    {
      icon: Users,
      label: 'Referral Earnings',
      value: formatUGX(stats.totalReferralEarnings),
      sub: 'Across all 3 levels',
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.2)',
    },
  ];

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">My Profile</h1>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center gold-gradient">
          <ShieldCheck size={15} className="text-black" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-10 space-y-4">

        {/* Account Card */}
        <div className="rounded-2xl p-5" style={{
          background: 'linear-gradient(135deg, #1a1400, #2a2000)',
          border: '1px solid rgba(201,168,76,0.35)',
        }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.12)', border: '2px solid rgba(201,168,76,0.4)' }}>
              <span className="text-[#c9a84c] text-2xl font-black">
                {currentUser.phone.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-black text-lg">{currentUser.phone}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-black px-2 py-0.5 rounded-full gold-gradient">Lv{currentUser.level}</span>
                <span className="text-gray-500 text-xs">#{currentUser.referralCode}</span>
              </div>
              <p className="text-gray-600 text-xs mt-1">
                Member since {new Date(currentUser.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid rgba(201,168,76,0.15)' }}>
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Current Balance</p>
              <p className="text-[#c9a84c] font-black text-xl">{formatUGX(currentUser.balance)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs mb-0.5">Cumulative Income</p>
              <p className="text-white font-black text-lg">{formatUGX(currentUser.cumulativeIncome)}</p>
            </div>
          </div>
        </div>

        {/* Personal Stats */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-[#c9a84c]" />
            <h2 className="text-white font-bold text-sm">Account Statistics</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl p-4"
                  style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <Icon size={14} style={{ color: stat.color }} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-medium">{stat.label}</p>
                  </div>
                  <p className="font-black text-base leading-tight" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5">{stat.sub}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Referral Commission Breakdown */}
        {stats.totalReferralEarnings > 0 && (
          <div className="rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-[#c9a84c]" />
              <p className="text-white font-bold text-sm">Referral Breakdown</p>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Level 1 (27%)', value: stats.commissions.level1, color: '#c9a84c' },
                { label: 'Level 2 (2%)', value: stats.commissions.level2, color: '#f59e0b' },
                { label: 'Level 3 (1%)', value: stats.commissions.level3, color: '#fbbf24' },
              ].map(tier => (
                <div key={tier.label} className="flex justify-between items-center py-2"
                  style={{ borderBottom: '1px solid #222' }}>
                  <span className="text-gray-500 text-xs">{tier.label}</span>
                  <span className="font-bold text-sm" style={{ color: tier.color }}>{formatUGX(tier.value)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1">
                <span className="text-white text-xs font-semibold">Total Earned</span>
                <span className="font-black text-sm text-[#c9a84c]">{formatUGX(stats.totalReferralEarnings)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 7-Day Earnings Chart */}
        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[#c9a84c]" />
              <h2 className="text-white font-bold text-sm">7-Day Earnings</h2>
            </div>
            <span className="text-gray-600 text-xs">
              Total: <span className="text-[#c9a84c] font-semibold">{formatUGX(chartData.reduce((s, d) => s + d.amount, 0))}</span>
            </span>
          </div>
          <p className="text-gray-600 text-[10px] mb-4">Daily income credits over the past week</p>

          {chartData.every(d => d.amount === 0) ? (
            <div className="flex flex-col items-center justify-center py-8">
              <TrendingUp size={28} className="text-gray-700 mb-2" />
              <p className="text-gray-600 text-xs text-center">No income credits yet.</p>
              <p className="text-gray-700 text-[10px] text-center mt-1">Purchase a VIP product to start earning daily income.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#555', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#444', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(201,168,76,0.06)' }}
                    contentStyle={{
                      background: '#1e1e1e',
                      border: '1px solid rgba(201,168,76,0.3)',
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: 11,
                    }}
                    formatter={(value: number) => [formatUGX(value), 'Income']}
                    labelStyle={{ color: '#c9a84c', fontWeight: 700 }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.amount === maxIncome && entry.amount > 0
                          ? '#c9a84c'
                          : entry.amount > 0
                            ? 'rgba(201,168,76,0.45)'
                            : '#2a2a2a'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-3 mt-2 justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: '#c9a84c' }} />
                  <span className="text-gray-600 text-[10px]">Peak day</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(201,168,76,0.45)' }} />
                  <span className="text-gray-600 text-[10px]">Income credited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: '#2a2a2a' }} />
                  <span className="text-gray-600 text-[10px]">No income</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Password Change */}
        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-2 mb-4">
            <Lock size={14} className="text-[#c9a84c]" />
            <h2 className="text-white font-bold text-sm">Change Password</h2>
          </div>

          <div className="space-y-3">
            {/* Current Password */}
            <div>
              <p className="text-gray-500 text-xs mb-1.5">Current Password</p>
              <div className="flex items-center rounded-xl px-3 py-3"
                style={{ background: '#1e1e1e', border: '1.5px solid #333' }}>
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
                />
                <button onClick={() => setShowOld(!showOld)} className="ml-2 text-gray-500">
                  {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <p className="text-gray-500 text-xs mb-1.5">New Password</p>
              <div className="flex items-center rounded-xl px-3 py-3"
                style={{ background: '#1e1e1e', border: '1.5px solid #333' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
                />
                <button onClick={() => setShowNew(!showNew)} className="ml-2 text-gray-500">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength bar */}
              {newPassword.length > 0 && (
                <div className="mt-1.5">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: '#2a2a2a' }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: strength.width, background: strength.color }} />
                  </div>
                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <p className="text-gray-500 text-xs mb-1.5">Confirm New Password</p>
              <div className="flex items-center rounded-xl px-3 py-3"
                style={{
                  background: '#1e1e1e',
                  border: `1.5px solid ${confirmPassword && newPassword && confirmPassword === newPassword ? 'rgba(34,197,94,0.4)' : '#333'}`,
                }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
                />
                <div className="flex items-center gap-1 ml-2">
                  {confirmPassword && newPassword && (
                    confirmPassword === newPassword
                      ? <CheckCircle size={13} className="text-green-400" />
                      : <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
                  )}
                  <button onClick={() => setShowConfirm(!showConfirm)} className="text-gray-500">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handlePasswordUpdate}
              disabled={saving}
              className="w-full py-3.5 rounded-xl font-bold text-black text-sm gold-gradient disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
            >
              <Lock size={14} />
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Security Tips */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-red-400 text-xs font-semibold mb-2">⚠ Security Notice</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p>• Never share your password with anyone, including customer support.</p>
            <p>• Use a combination of letters and numbers for a stronger password.</p>
            <p>• Change your password regularly to keep your account secure.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
