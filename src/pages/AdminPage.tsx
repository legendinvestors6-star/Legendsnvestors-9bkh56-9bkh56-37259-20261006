import { useState, useEffect } from "react";
import {
  Users, CreditCard, ArrowDownToLine, BarChart3, Check, X, Search,
  LogOut, Shield, TrendingUp, Gift, Bell, DollarSign, Trash2, Eye, Copy, Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { PRODUCTS } from "@/constants/products";
import {
  getUsers, getRechargeOrders, getWithdrawOrders, getUserProducts,
  approveRechargeOrder, rejectRechargeOrder, approveWithdrawOrder, rejectWithdrawOrder,
  setCurrentUser, formatUGX, updateUser, addTransaction, getTransactions,
  getGiftCodes, createGiftCode, deleteGiftCode,
  getPasswordResets, approvePasswordReset, rejectPasswordReset
} from "@/lib/storage";
import type { PasswordResetRequest } from "@/lib/storage";
import type { GiftCode } from "@/lib/storage";
import type { User, RechargeOrder, WithdrawOrder } from "@/types";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function GiftToolsTab({
  users,
  rechargeOrders,
  withdrawOrders,
  onRefresh,
}: {
  users: User[];
  rechargeOrders: RechargeOrder[];
  withdrawOrders: WithdrawOrder[];
  onRefresh: () => void;
}) {
  const [giftCode, setGiftCode] = useState("");
  const [giftAmount, setGiftAmount] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [creditUser, setCreditUser] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [deductUser, setDeductUser] = useState("");
  const [deductAmount, setDeductAmount] = useState("");
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>(() => getGiftCodes());

  const refreshCodes = () => setGiftCodes(getGiftCodes());

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid rgba(201,168,76,0.3)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Gift size={16} className="text-[#c9a84c]" />
          <p className="text-white font-bold text-sm">Create Gift Code</p>
        </div>

        <div className="space-y-2">
          <input
            value={giftCode}
            onChange={e => setGiftCode(e.target.value.toUpperCase())}
            placeholder="Custom code (optional)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none uppercase tracking-widest"
            style={{ background: "#1e1e1e", border: "1px solid #333" }}
          />

          <input
            value={giftAmount}
            onChange={e => setGiftAmount(e.target.value)}
            type="number"
            placeholder="Amount (UGX)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none bg-transparent"
            style={{ background: "#1e1e1e", border: "1px solid #333" }}
          />

          <input
            value={giftNote}
            onChange={e => setGiftNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none bg-transparent"
            style={{ background: "#1e1e1e", border: "1px solid #333" }}
          />

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <span className="text-yellow-400 text-xs">⏱</span>
            <span className="text-yellow-300 text-xs font-medium">Code expires automatically 30 minutes after creation</span>
          </div>

          <button
            onClick={() => {
              const amt = Number(giftAmount);
              if (!giftCode && !giftAmount) {
                toast.error("Enter a valid amount");
                return;
              }
              if (amt <= 0 || Number.isNaN(amt)) {
                toast.error("Enter a valid amount");
                return;
              }

              const created = createGiftCode(amt, giftNote || undefined, giftCode || undefined);
              toast.success(`Gift code created: ${created.code}`);
              setGiftCode("");
              setGiftAmount("");
              setGiftNote("");
              refreshCodes();
              onRefresh();
            }}
            className="w-full py-3 rounded-xl font-bold text-black text-sm gold-gradient flex items-center justify-center gap-2"
          >
            <Plus size={15} /> Generate Gift Code
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid rgba(201,168,76,0.25)" }}>
        <p className="text-white font-bold text-sm mb-3">Gift Code Summary</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Total Created", value: giftCodes.length, color: "#c9a84c" },
            { label: "Total Redeemed", value: giftCodes.filter(c => c.usedBy).length, color: "#22c55e" },
            { label: "UGX Distributed", value: formatUGX(giftCodes.filter(c => c.usedBy).reduce((s, c) => s + c.amount, 0)), color: "#f0c040" },
            { label: "Available / Expired", value: `${giftCodes.filter(c => !c.usedBy && !(c.expiresAt && new Date(c.expiresAt) < new Date())).length} / ${giftCodes.filter(c => !c.usedBy && c.expiresAt && new Date(c.expiresAt) < new Date()).length}`, color: "#60a5fa" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: "#1e1e1e" }}>
              <p className="font-black text-sm" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold text-sm">Gift Codes ({giftCodes.length})</p>
          <span className="text-[10px] text-gray-500">{giftCodes.filter(c => !c.usedBy).length} available</span>
        </div>

        {giftCodes.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-4">No gift codes yet. Create one above.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {giftCodes.map(gc => (
              <div
                key={gc.id}
                className="rounded-xl p-3 flex items-center justify-between"
                style={{ background: "#1e1e1e", border: `1px solid ${gc.usedBy ? "#2a2a2a" : "rgba(201,168,76,0.2)"}` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black tracking-widest text-sm" style={{ color: gc.usedBy ? "#555" : "#c9a84c" }}>{gc.code}</span>
                    {!gc.usedBy && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(gc.code);
                          toast.success("Copied!");
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ background: "#333" }}
                      >
                        <Copy size={11} className="text-gray-400" />
                      </button>
                    )}
                  </div>

                  <p className="text-[#c9a84c] text-xs font-bold">{formatUGX(gc.amount)}</p>

                  {gc.note && <p className="text-gray-600 text-[10px]">{gc.note}</p>}

                  {gc.usedBy ? (() => {
                    const redeemer = users.find(u => u.id === gc.usedBy);
                    const redeemedAt = gc.usedAt ? new Date(gc.usedAt) : null;
                    return (
                      <div className="mt-1 rounded-lg p-1.5" style={{ background: "rgba(34,197,94,0.08)" }}>
                        <p className="text-green-400 text-[10px] font-semibold">✓ Redeemed by: {redeemer?.phone || gc.usedBy}</p>
                        {redeemedAt && (
                          <p className="text-green-600 text-[9px]">{redeemedAt.toLocaleDateString()} at {redeemedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                        )}
                      </div>
                    );
                  })() : gc.expiresAt && new Date(gc.expiresAt) < new Date() ? (
                    <p className="text-red-400 text-[10px]">Expired · {new Date(gc.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  ) : gc.expiresAt ? (() => {
                    const msLeft = new Date(gc.expiresAt).getTime() - Date.now();
                    const minLeft = Math.max(0, Math.floor(msLeft / 60000));
                    const secLeft = Math.max(0, Math.floor((msLeft % 60000) / 1000));
                    return <p className="text-yellow-400 text-[10px]">⏱ Expires in {minLeft}m {secLeft}s</p>;
                  })() : (
                    <p className="text-gray-600 text-[10px]">No expiry · {new Date(gc.createdAt).toLocaleDateString()}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-2">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={
                      gc.usedBy
                        ? { background: "rgba(34,197,94,0.1)", color: "#22c55e" }
                        : gc.expiresAt && new Date(gc.expiresAt) < new Date()
                          ? { background: "rgba(239,68,68,0.1)", color: "#ef4444" }
                          : { background: "rgba(201,168,76,0.1)", color: "#c9a84c" }
                    }
                  >
                    {gc.usedBy ? "USED" : gc.expiresAt && new Date(gc.expiresAt) < new Date() ? "EXPIRED" : "ACTIVE"}
                  </span>

                  <button
                    onClick={() => {
                      deleteGiftCode(gc.id);
                      refreshCodes();
                      toast.success("Deleted");
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.1)" }}
                  >
                    <Trash2 size={11} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={16} className="text-[#c9a84c]" />
          <p className="text-white font-bold text-sm">Credit Balance to User</p>
        </div>

        <div className="space-y-2">
          <select
            value={creditUser}
            onChange={e => setCreditUser(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: "#1e1e1e", border: "1px solid #333" }}
          >
            <option value="">Select user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.phone} — {formatUGX(u.balance)}</option>
            ))}
          </select>

          <input
            value={creditAmount}
            onChange={e => setCreditAmount(e.target.value)}
            type="number"
            placeholder="Amount (UGX)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none bg-transparent"
            style={{ background: "#1e1e1e", border: "1px solid #333" }}
          />

          <input
            value={creditNote}
            onChange={e => setCreditNote(e.target.value)}
            type="text"
            placeholder="Note (optional)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none bg-transparent"
            style={{ background: "#1e1e1e", border: "1px solid #333" }}
          />

          <button
            onClick={() => {
              const amt = Number(creditAmount);
              if (!creditUser) { toast.error("Select a user"); return; }
              if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

              const usr = getUsers().find(u => u.id === creditUser);
              if (!usr) return;

              updateUser(creditUser, { balance: usr.balance + amt, cumulativeIncome: usr.cumulativeIncome + amt });
              addTransaction({
                userId: creditUser,
                type: "income",
                amount: amt,
                status: "completed",
                description: creditNote || "Admin credit"
              });

              toast.success(`Credited ${formatUGX(amt)} to ${usr.phone}`);
              setCreditUser("");
              setCreditAmount("");
              setCreditNote("");
              onRefresh();
            }}
            className="w-full py-3 rounded-xl font-bold text-black text-sm gold-gradient"
          >
            Credit Balance
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={16} className="text-red-400" />
          <p className="text-white font-bold text-sm">Deduct Balance</p>
        </div>

        <div className="space-y-2">
          <select
            value={deductUser}
            onChange={e => setDeductUser(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: "#1e1e1e", border: "1px solid #333" }}
          >
            <option value="">Select user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.phone} — {formatUGX(u.balance)}</option>
            ))}
          </select>

          <input
            value={deductAmount}
            onChange={e => setDeductAmount(e.target.value)}
            type="number"
            placeholder="Amount to deduct (UGX)"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none bg-transparent"
            style={{ background: "#1e1e1e", border: "1px solid #333" }}
          />

          <button
            onClick={() => {
              const amt = Number(deductAmount);
              if (!deductUser) { toast.error("Select a user"); return; }
              if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

              const usr = getUsers().find(u => u.id === deductUser);
              if (!usr) return;
              if (amt > usr.balance) { toast.error("Amount exceeds user balance"); return; }

              updateUser(deductUser, { balance: usr.balance - amt });
              addTransaction({
                userId: deductUser,
                type: "withdraw",
                amount: -amt,
                status: "completed",
                description: "Admin deduction"
              });

              toast.success(`Deducted ${formatUGX(amt)} from ${usr.phone}`);
              setDeductUser("");
              setDeductAmount("");
              onRefresh();
            }}
            className="w-full py-3 rounded-xl font-bold text-red-400 text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            Deduct Balance
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-yellow-400" />
          <p className="text-white font-bold text-sm">Platform Stats</p>
        </div>

        <div className="space-y-2">
          {[
            { label: "Total Users", value: users.length },
            { label: "Total Recharge Orders", value: rechargeOrders.length },
            { label: "Total Withdraw Orders", value: withdrawOrders.length },
            { label: "Completed Recharges", value: formatUGX(rechargeOrders.filter(o => o.status === "completed").reduce((s, o) => s + o.amount, 0)) },
            { label: "Pending Withdrawals", value: formatUGX(withdrawOrders.filter(o => o.status === "pending").reduce((s, o) => s + o.amount, 0)) },
            { label: "Total Platform Balances", value: formatUGX(users.reduce((s, u) => s + u.balance, 0)) },
            { label: "Active Gift Codes", value: getGiftCodes().filter(c => !c.usedBy).length },
          ].map(stat => (
            <div key={stat.label} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid #222" }}>
              <span className="text-gray-500 text-xs">{stat.label}</span>
              <span className="text-white font-bold text-sm">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 mb-3">
          <Eye size={16} className="text-blue-400" />
          <p className="text-white font-bold text-sm">View User Transactions</p>
        </div>

        <select
          onChange={e => {
            const uid = e.target.value;
            if (!uid) return;

            const txs = getTransactions(uid);
            const usr = getUsers().find(u => u.id === uid);

            alert(
              `${usr?.phone} — ${txs.length} transactions\n\n` +
              txs.slice(0, 10).map(t => `${t.type.toUpperCase()}: ${t.amount >= 0 ? "+" : ""}${t.amount} UGX — ${t.description} (${t.status})`).join("\n")
            );
          }}
          className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
          style={{ background: "#1e1e1e", border: "1px solid #333" }}
        >
          <option value="">Select user to view transactions...</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.phone} — {formatUGX(u.balance)}</option>)}
        </select>
      </div>
    </div>
  );
}

type AdminTab = "overview" | "users" | "recharge" | "withdraw" | "products" | "gifts" | "resets";

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [searchQ, setSearchQ] = useState("");
  const [refresh, setRefresh] = useState(0);

  const users = getUsers().filter(u => !u.isAdmin);
  const rechargeOrders = getRechargeOrders();
  const withdrawOrders = getWithdrawOrders();
  const userProducts = getUserProducts();

  const pendingRecharge = rechargeOrders.filter(o => o.status === "pending");
  const pendingWithdraw = withdrawOrders.filter(o => o.status === "pending");
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);
  const totalRecharge = rechargeOrders.filter(o => o.status === "completed").reduce((s, o) => s + o.amount, 0);

  const handleApproveRecharge = (orderId: string) => {
    approveRechargeOrder(orderId);
    toast.success("Recharge approved");
    setRefresh(r => r + 1);
  };

  const handleRejectRecharge = (orderId: string) => {
    rejectRechargeOrder(orderId);
    toast.success("Recharge rejected");
    setRefresh(r => r + 1);
  };

  const handleApproveWithdraw = (orderId: string) => {
    approveWithdrawOrder(orderId);
    toast.success("Withdrawal approved");
    setRefresh(r => r + 1);
  };

  const handleRejectWithdraw = (orderId: string) => {
    rejectWithdrawOrder(orderId);
    toast.success("Withdrawal rejected");
    setRefresh(r => r + 1);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate("/login");
  };

  const filteredUsers = users.filter(u => u.phone.toLowerCase().includes(searchQ.toLowerCase()));

  const passwordResets = getPasswordResets();
  const pendingResets = passwordResets.filter(r => r.status === "pending");

  const tabs: { key: AdminTab; label: string; icon: typeof BarChart3; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users, badge: users.length },
    { key: "recharge", label: "Recharge", icon: CreditCard, badge: pendingRecharge.length },
    { key: "withdraw", label: "Withdraw", icon: ArrowDownToLine, badge: pendingWithdraw.length },
    { key: "products", label: "Products", icon: TrendingUp },
    { key: "resets", label: "Resets", icon: Shield, badge: pendingResets.length },
    { key: "gifts", label: "Tools", icon: Gift },
  ];

  const getStatusStyle = (status: string) => {
    if (status === "completed") return { background: "rgba(201,168,76,0.1)", color: "#c9a84c" };
    if (status === "pending") return { background: "rgba(251,191,36,0.1)", color: "#fbbf24" };
    return { background: "rgba(239,68,68,0.1)", color: "#ef4444" };
  };

  return (
    <div className="app-container min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="flex items-center justify-between p-4" style={{ background: "#111111", borderBottom: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-[#c9a84c]" />
          <span className="text-white font-black text-lg">Admin Panel</span>
          <span className="text-[9px] font-bold text-black px-2 py-0.5 rounded-full gold-gradient ml-1">LEGEND</span>
        </div>
        <button onClick={handleLogout} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#1e1e1e" }}>
          <LogOut size={15} className="text-gray-400" />
        </button>
      </div>

      <div className="flex gap-0 overflow-x-auto" style={{ background: "#111111", borderBottom: "1px solid #1a1a1a" }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-semibold relative transition-colors"
              style={tab === t.key ? { color: "#c9a84c", borderBottom: "2px solid #c9a84c" } : { color: "#555" }}
            >
              <Icon size={13} />
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="absolute top-1.5 right-1 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center gold-gradient">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 pb-8">
        {tab === "overview" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Users", value: users.length, color: "#c9a84c" },
                { label: "Pending Recharge", value: pendingRecharge.length, color: "#fbbf24" },
                { label: "Pending Withdraw", value: pendingWithdraw.length, color: "#f87171" },
                { label: "Active Products", value: userProducts.filter(p => p.status === "active").length, color: "#34d399" },
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                  <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid rgba(201,168,76,0.2)" }}>
              <p className="text-gray-500 text-xs mb-1">Total Platform Balance</p>
              <p className="text-[#c9a84c] text-2xl font-black">{formatUGX(totalBalance)}</p>
            </div>

            <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
              <p className="text-gray-500 text-xs mb-1">Total Completed Recharges</p>
              <p className="text-white text-2xl font-black">{formatUGX(totalRecharge)}</p>
            </div>

            {pendingRecharge.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <p className="text-yellow-400 font-semibold text-sm mb-1">⚠ Action Required</p>
                <p className="text-gray-400 text-xs">{pendingRecharge.length} recharge order(s) pending approval</p>
                <p className="text-gray-400 text-xs">{pendingWithdraw.length} withdrawal order(s) pending approval</p>
              </div>
            )}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
              <Search size={14} className="text-gray-500" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by phone..."
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
              />
            </div>

            <p className="text-gray-600 text-xs">{filteredUsers.length} users</p>

            {filteredUsers.map(user => (
              <div key={user.id} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-bold text-sm">{user.phone}</p>
                    <p className="text-gray-500 text-xs">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] font-bold text-black px-2 py-0.5 rounded-full gold-gradient">Lv{user.level}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-xl p-2 text-center" style={{ background: "#1e1e1e" }}>
                    <p className="text-[#c9a84c] font-bold text-sm">{formatUGX(user.balance)}</p>
                    <p className="text-gray-600 text-[10px]">Balance</p>
                  </div>

                  <div className="rounded-xl p-2 text-center" style={{ background: "#1e1e1e" }}>
                    <p className="text-white font-bold text-sm">{user.referralCode}</p>
                    <p className="text-gray-600 text-[10px]">Referral Code</p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const amt = parseInt(prompt("Add balance amount (UGX):") || "0");
                      if (amt > 0) {
                        updateUser(user.id, { balance: user.balance + amt });
                        toast.success(`Added ${formatUGX(amt)} to ${user.phone}`);
                        setRefresh(r => r + 1);
                      }
                    }}
                    className="py-2 rounded-xl text-xs font-semibold text-black gold-gradient"
                  >
                    + Add Balance
                  </button>

                  <button
                    onClick={() => {
                      const pwd = prompt("New password:");
                      if (pwd) {
                        updateUser(user.id, { password: pwd });
                        toast.success("Password updated");
                      }
                    }}
                    className="py-2 rounded-xl text-xs font-semibold text-gray-300"
                    style={{ background: "#2a2a2a" }}
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "recharge" && (
          <div className="space-y-3">
            <p className="text-gray-500 text-xs">{rechargeOrders.length} total orders — {pendingRecharge.length} pending</p>

            {rechargeOrders.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#151515" }}>
                <p className="text-gray-600 text-sm">No recharge orders</p>
              </div>
            ) : (
              rechargeOrders.map(order => {
                const user = getUsers().find(u => u.id === order.userId);

                return (
                  <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold">{formatUGX(order.amount)}</p>
                          <span
                            className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                            style={
                              order.paymentMethod === "MTN"
                                ? { background: "rgba(255,204,0,0.12)", color: "#ffcc00", border: "1px solid rgba(255,204,0,0.25)" }
                                : { background: "rgba(239,58,58,0.12)", color: "#ef3a3a", border: "1px solid rgba(239,58,58,0.25)" }
                            }
                          >
                            {order.paymentMethod === "MTN" ? "MoMo MTN" : "Airtel Money"}
                          </span>
                        </div>

                        <p className="text-gray-400 text-xs font-medium mb-2">{user?.phone || "Unknown"}</p>

                        <div className="rounded-xl p-2.5 space-y-1.5 mb-1.5" style={{ background: "#1e1e1e", border: "1px solid #333" }}>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Sender Number</span>
                            <span className="text-white font-semibold">+256 {order.phoneNumber || "—"}</span>
                          </div>

                          {order.paymentMethod === "MTN" ? (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Paid To (MTN)</span>
                                <span className="text-[#c9a84c] font-bold">{order.mtnAccount || "0756406186"}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Account Name</span>
                                <span className="text-gray-300">{order.mtnName || "Nabakooza Milly"}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Dial</span>
                                <span className="text-green-400 font-semibold">*185*1#</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Merchant Code</span>
                                <span className="text-[#c9a84c] font-bold">7232654</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Merchant Name</span>
                                <span className="text-gray-300">Social Development Investors</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Dial</span>
                                <span className="text-green-400 font-semibold">*185*9#</span>
                              </div>
                            </>
                          )}
                        </div>

                        <p className="text-gray-600 text-xs">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>

                      <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={getStatusStyle(order.status)}>
                        {order.status}
                      </span>
                    </div>

                    {order.status === "pending" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleApproveRecharge(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1 gold-gradient">
                          <Check size={13} /> Approve
                        </button>
                        <button onClick={() => handleRejectRecharge(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400 flex items-center justify-center gap-1" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <X size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "withdraw" && (
          <div className="space-y-3">
            <p className="text-gray-500 text-xs">{withdrawOrders.length} total — {pendingWithdraw.length} pending</p>

            {withdrawOrders.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#151515" }}>
                <p className="text-gray-600 text-sm">No withdrawal orders</p>
              </div>
            ) : (
              withdrawOrders.map(order => {
                const user = getUsers().find(u => u.id === order.userId);

                return (
                  <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-bold">{formatUGX(order.amount)}</p>
                        <p className="text-gray-400 text-xs">{user?.phone || "Unknown"}</p>
                        <p className="text-gray-500 text-xs">{order.bankCard?.bank} — {order.bankCard?.accountNumber}</p>
                        <p className="text-gray-500 text-xs">Received: {formatUGX(order.receivedAmount)} (fee: {formatUGX(order.fee)})</p>
                        <p className="text-gray-600 text-xs">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={getStatusStyle(order.status)}>
                        {order.status}
                      </span>
                    </div>

                    {order.status === "pending" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleApproveWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1 gold-gradient">
                          <Check size={13} /> Approve
                        </button>
                        <button onClick={() => handleRejectWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400 flex items-center justify-center gap-1" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <X size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "products" && (
          <div className="space-y-3">
            <div className="rounded-2xl p-3" style={{ background: "#151515", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[#c9a84c] font-black text-xl">{userProducts.length}</p>
                  <p className="text-gray-600 text-[10px]">Total Purchases</p>
                </div>
                <div>
                  <p className="text-green-400 font-black text-xl">{userProducts.filter(p => p.status === "active").length}</p>
                  <p className="text-gray-600 text-[10px]">Active</p>
                </div>
                <div>
                  <p className="text-gray-400 font-black text-xl">{userProducts.filter(p => p.status === "expired").length}</p>
                  <p className="text-gray-600 text-[10px]">Expired</p>
                </div>
              </div>
            </div>

            {PRODUCTS.map(product => {
              const purchases = userProducts.filter(p => p.productId === product.id);
              const activeCount = purchases.filter(p => p.status === "active").length;

              return (
                <div key={product.id} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-black px-1.5 py-0.5 rounded gold-gradient">VIP{product.vip}</span>
                        <p className="text-white font-semibold text-sm">{product.name}</p>
                      </div>
                      <p className="text-[#c9a84c] font-bold mt-1">{formatUGX(product.price)}</p>
                      <p className="text-gray-500 text-xs">Daily: {formatUGX(product.dailyIncome)} · Total: {formatUGX(product.totalIncome)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-black text-white">{purchases.length}</p>
                      <p className="text-gray-500 text-[10px]">purchases</p>
                      {activeCount > 0 && <p className="text-green-400 text-[10px]">{activeCount} active</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "resets" && (
          <div className="space-y-3">
            <p className="text-gray-500 text-xs">{passwordResets.length} total requests — {pendingResets.length} pending</p>

            {passwordResets.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#151515" }}>
                <p className="text-gray-600 text-sm">No password reset requests</p>
              </div>
            ) : (
              passwordResets.map((req: PasswordResetRequest) => (
                <div
                  key={req.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: "#151515",
                    border: `1px solid ${req.status === "pending" ? "rgba(245,158,11,0.35)" : "#2a2a2a"}`,
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-bold text-sm">{req.phone}</p>
                      <p className="text-gray-500 text-xs">{new Date(req.createdAt).toLocaleString()}</p>
                    </div>

                    <span
                      className="text-[10px] px-2 py-1 rounded-full font-bold"
                      style={
                        req.status === "approved"
                          ? { background: "rgba(34,197,94,0.12)", color: "#22c55e" }
                          : req.status === "rejected"
                            ? { background: "rgba(239,68,68,0.12)", color: "#ef4444" }
                            : { background: "rgba(245,158,11,0.12)", color: "#f59e0b" }
                      }
                    >
                      {req.status.toUpperCase()}
                    </span>
                  </div>

                  {req.status === "pending" && (
                    <div className="rounded-xl p-2.5 mb-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                      <p className="text-gray-500 text-[10px] mb-0.5">Requested new password:</p>
                      <p className="text-yellow-300 text-xs font-mono font-semibold">{req.newPassword}</p>
                      <p className="text-gray-600 text-[9px] mt-1">Approving will apply this password to the account.</p>
                    </div>
                  )}

                  {req.resolvedAt && (
                    <p className="text-gray-600 text-[10px] mb-2">Resolved: {new Date(req.resolvedAt).toLocaleString()}</p>
                  )}

                  {req.note && (
                    <p className="text-red-400 text-xs mb-2">Note: {req.note}</p>
                  )}

                  {req.status === "pending" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          approvePasswordReset(req.id);
                          toast.success(`Password reset approved for ${req.phone}`);
                          setRefresh(r => r + 1);
                        }}
                        className="py-2.5 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1 gold-gradient"
                      >
                        <Check size={13} /> Approve
                      </button>

                      <button
                        onClick={() => {
                          const note = prompt("Reason for rejection (optional):") || undefined;
                          rejectPasswordReset(req.id, note);
                          toast.success("Reset request rejected");
                          setRefresh(r => r + 1);
                        }}
                        className="py-2.5 rounded-xl text-xs font-bold text-red-400 flex items-center justify-center gap-1"
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "gifts" && (
          <GiftToolsTab
            users={users}
            rechargeOrders={rechargeOrders}
            withdrawOrders={withdrawOrders}
            onRefresh={() => setRefresh(r => r + 1)}
          />
        )}
      </div>
    </div>
  );
}