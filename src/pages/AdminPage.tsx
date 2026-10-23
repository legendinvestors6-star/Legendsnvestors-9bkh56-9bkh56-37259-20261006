import { useMemo, useState } from "react";
import {
  Users, CreditCard, ArrowDownToLine, BarChart3, Check, X, Search,
  LogOut, Shield, TrendingUp, Gift, Bell, DollarSign, Trash2, Eye,
  Copy, Plus, Filter, Download, ArrowUpDown, UserCog, RefreshCw,
  Wallet, UserCheck, UserX, FileText, Percent, Layers3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PRODUCTS } from "@/constants/products";
import {
  getUsers, getRechargeOrders, getWithdrawOrders, getUserProducts,
  approveRechargeOrder, rejectRechargeOrder, approveWithdrawOrder, rejectWithdrawOrder,
  setCurrentUser, formatUGX, updateUser, addTransaction, getTransactions,
  getGiftCodes, createGiftCode, deleteGiftCode,
  getPasswordResets, approvePasswordReset, rejectPasswordReset
} from "@/lib/storage";
import type { User, RechargeOrder, WithdrawOrder, UserProduct } from "@/types";

type AdminTab =
  | "overview"
  | "users"
  | "recharge"
  | "withdraw"
  | "products"
  | "gifts"
  | "resets";

type UserSummary = {
  id: string;
  phone: string;
  fullName?: string;
  balance: number;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  isAdmin: boolean;
  isBanned: boolean;
  isDeleted: boolean;
  totalEarned: number;
  totalWithdrawn: number;
  totalDeposited: number;
  activePackages: number;
  totalPackages: number;
  teamMembers: any[];
  teamSize: number;
  level: number;
};

type SortKey = "phone" | "balance" | "createdAt" | "referralCode" | "teamSize";

function GiftToolsTab({
  users,
  rechargeOrders,
  withdrawOrders,
  onRefresh
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
  const [giftCodes, setGiftCodes] = useState<any[]>(() => getGiftCodes());

  const refreshCodes = () => setGiftCodes(getGiftCodes());

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
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
              { label: "UGX Distributed", value: formatUGX(giftCodes.filter(c => c.usedBy).reduce((s, c) => s + Number(c.amount || 0), 0)), color: "#f0c040" },
              { label: "Available / Expired", value: `${giftCodes.filter(c => !c.usedBy && !(c.expiresAt && new Date(c.expiresAt) < new Date())).length} / ${giftCodes.filter(c => !c.usedBy && c.expiresAt && new Date(c.expiresAt) < new Date()).length}`, color: "#60a5fa" },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: "#1e1e1e" }}>
                <p className="font-black text-sm" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-[#c9a84c]" />
            <p className="text-white font-bold text-sm">Credit Balance</p>
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

                const usr = getUsers().find(u => u.id === creditUser) as User | undefined;
                if (!usr) return;

                updateUser(creditUser, { balance: usr.balance + amt, cumulativeIncome: usr.cumulativeIncome + amt } as any);
                addTransaction({
                  userId: creditUser,
                  type: "income",
                  amount: amt,
                  status: "completed",
                  description: creditNote || "Admin credit"
                } as any);

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

                const usr = getUsers().find(u => u.id === deductUser) as User | undefined;
                if (!usr) return;
                if (amt > usr.balance) { toast.error("Amount exceeds user balance"); return; }

                updateUser(deductUser, { balance: usr.balance - amt } as any);
                addTransaction({
                  userId: deductUser,
                  type: "withdraw",
                  amount: -amt,
                  status: "completed",
                  description: "Admin deduction"
                } as any);

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

                  {gc.usedBy ? (
                    <div className="mt-1 rounded-lg p-1.5" style={{ background: "rgba(34,197,94,0.08)" }}>
                      <p className="text-green-400 text-[10px] font-semibold">✓ Redeemed by: {users.find(u => u.id === gc.usedBy)?.phone || gc.usedBy}</p>
                    </div>
                  ) : gc.expiresAt && new Date(gc.expiresAt) < new Date() ? (
                    <p className="text-red-400 text-[10px]">Expired</p>
                  ) : gc.expiresAt ? (
                    <p className="text-yellow-400 text-[10px]">Active until {new Date(gc.expiresAt).toLocaleString()}</p>
                  ) : (
                    <p className="text-gray-600 text-[10px]">No expiry</p>
                  )}
                </div>

                <button
                  onClick={() => {
                    deleteGiftCode(gc.id);
                    refreshCodes();
                    toast.success("Gift code deleted");
                  }}
                  className="w-7 h-7 rounded flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.12)" }}
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserDetailModal({
  user,
  onClose
}: {
  user: UserSummary | null;
  onClose: () => void;
}) {
  if (!user) return null;

  const allTx = getTransactions(user.id);
  const dept = user.teamMembers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-black text-xl">{user.fullName || user.phone}</p>
            <p className="text-gray-500 text-xs">{user.phone}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[#1d1d1d] text-gray-300 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl p-3" style={{ background: "#171717", border: "1px solid #2a2a2a" }}>
            <p className="text-gray-500 text-[10px]">Balance</p>
            <p className="text-[#c9a84c] font-black text-lg">{formatUGX(user.balance)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#171717", border: "1px solid #2a2a2a" }}>
            <p className="text-gray-500 text-[10px]">Referral Code</p>
            <p className="text-white font-bold text-lg">{user.referralCode}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#171717", border: "1px solid #2a2a2a" }}>
            <p className="text-gray-500 text-[10px]">Created</p>
            <p className="text-white font-bold text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#171717", border: "1px solid #2a2a2a" }}>
            <p className="text-gray-500 text-[10px]">Team Size</p>
            <p className="text-white font-bold text-lg">{user.teamSize}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
            <p className="text-white font-bold text-sm mb-3">Transaction History</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allTx.length === 0 ? (
                <p className="text-gray-600 text-xs">No transactions yet.</p>
              ) : (
                allTx.map(tx => (
                  <div key={tx.id} className="rounded-xl p-2.5" style={{ background: "#1d1d1d", border: "1px solid #2a2a2a" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-semibold uppercase">{tx.type}</span>
                      <span className={tx.amount >= 0 ? "text-green-400 text-xs font-bold" : "text-red-400 text-xs font-bold"}>
                        {tx.amount >= 0 ? "+" : "-"}{formatUGX(Math.abs(tx.amount))}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[10px] mt-1">{tx.description}</p>
                    <p className="text-gray-600 text-[10px] mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
            <p className="text-white font-bold text-sm mb-3">Team Members</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dept.length === 0 ? (
                <p className="text-gray-600 text-xs">No team members found.</p>
              ) : (
                dept.map((m: any) => (
                  <div key={m.id} className="rounded-xl p-2.5" style={{ background: "#1d1d1d", border: "1px solid #2a2a2a" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs">{m.phone || "Unknown"}</span>
                      <span className="text-[#c9a84c] text-[10px]">{formatUGX(Number(m.balance || 0))}</span>
                    </div>
                    <p className="text-gray-500 text-[10px]">{m.referralCode || "No code"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned" | "deleted">("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const users = useMemo<UserSummary[]>(() => {
    const allUsers = getUsers() || [];
    const rawUsers = allUsers.filter((u: any) => !(u.isAdmin || u.is_admin || u.isadmin));

    return rawUsers.map((u: any) => {
      const referralCode = u.referralCode || u.referral_code || u.referral || "";
      const referredBy = u.referredBy || u.referred_by || u.referrer || "";

      const teamMembers = allUsers.filter((x: any) => {
        const xReferredBy = x.referredBy || x.referred_by || x.referrer || "";
        return xReferredBy === u.id;
      });

      const txs = getTransactions(u.id) || [];
      const totalEarned = txs
        .filter((t: any) => t.type === "income" || t.type === "bonus" || t.type === "gift" || t.type === "referral" || Number(t.amount || 0) > 0)
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

      const userProducts = getUserProducts(u.id) || [];
      const userWithdrawals = getWithdrawOrders(u.id) || [];
      const userRecharges = getRechargeOrders(u.id) || [];

      return {
        id: u.id,
        phone: u.phone,
        fullName: u.fullName || u.full_name || u.name || "",
        balance: Number(u.balance || 0),
        referralCode,
        referredBy,
        createdAt: u.createdAt || u.created_at || "",
        isAdmin: !!(u.isAdmin || u.is_admin || u.isadmin),
        isBanned: !!(u.isBanned || u.is_banned || u.banned || u.status === "banned"),
        isDeleted: !!(u.isDeleted || u.is_deleted || u.deleted || u.deleted_at),
        totalEarned,
        totalWithdrawn: userWithdrawals.filter((w: any) => w.status === "completed").reduce((s: number, w: any) => s + Number(w.amount || 0), 0),
        totalDeposited: userRecharges.filter((r: any) => r.status === "completed").reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
        activePackages: userProducts.filter((p: any) => p.status === "active").length,
        totalPackages: userProducts.length,
        teamMembers,
        teamSize: teamMembers.length,
        level: Number(u.level || 1)
      } as UserSummary;
    });
  }, [refreshKey]);

  const rechargeOrders = getRechargeOrders();
  const withdrawOrders = getWithdrawOrders();
  const userProducts = getUserProducts();
  const passwordResets = getPasswordResets();

  const pendingRecharge = rechargeOrders.filter((o: any) => o.status === "pending");
  const pendingWithdraw = withdrawOrders.filter((o: any) => o.status === "pending");
  const pendingResets = passwordResets.filter((r: any) => r.status === "pending");

  const totalBalance = users.reduce((s, u) => s + Number(u.balance || 0), 0);
  const totalRecharge = rechargeOrders.filter((o: any) => o.status === "completed").reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalWithdrawn = withdrawOrders.filter((o: any) => o.status === "completed").reduce((s, o) => s + Number(o.amount || 0), 0);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const q = searchQ.trim().toLowerCase();
        const wordMatch = !q || `${u.phone} ${u.fullName || ""} ${u.referralCode}`.toLowerCase().includes(q);
        const statusMatch =
          statusFilter === "all" ||
          (statusFilter === "active" && !u.isBanned && !u.isDeleted) ||
          (statusFilter === "banned" && u.isBanned) ||
          (statusFilter === "deleted" && u.isDeleted);

        return wordMatch && statusMatch;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;

        const values: Record<SortKey, any> = {
          phone: (a.phone || "").localeCompare(b.phone || ""),
          balance: Number(a.balance) - Number(b.balance),
          createdAt: new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          referralCode: (a.referralCode || "").localeCompare(b.referralCode || ""),
          teamSize: Number(a.teamSize) - Number(b.teamSize)
        };

        return values[sortKey] * dir;
      });
  }, [users, searchQ, statusFilter, sortKey, sortDir]);

  const exportUsersCSV = () => {
    const rows = [
      ["Phone", "Full Name", "Balance", "Referral Code", "Created At", "Team Size", "Status"],
      ...filteredUsers.map(u => [
        u.phone,
        u.fullName || "",
        String(u.balance),
        u.referralCode,
        new Date(u.createdAt).toLocaleString(),
        String(u.teamSize),
        u.isBanned ? "banned" : u.isDeleted ? "deleted" : "active"
      ])
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legend-admin-users.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Users exported");
  };

  const toggleSelectUser = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const bulkBan = () => {
    if (!selectedIds.length) return toast.error("Select users first");
    selectedIds.forEach(id => {
      updateUser(id, { isBanned: true, status: "banned" } as any);
    });
    toast.success(`${selectedIds.length} users banned`);
    setRefreshKey(v => v + 1);
    setSelectedIds([]);
  };

  const bulkDelete = () => {
    if (!selectedIds.length) return toast.error("Select users first");
    selectedIds.forEach(id => {
      updateUser(id, { isDeleted: true, status: "deleted" } as any);
    });
    toast.success(`${selectedIds.length} users deleted`);
    setRefreshKey(v => v + 1);
    setSelectedIds([]);
  };

  const handleApproveRecharge = (orderId: string) => {
    approveRechargeOrder(orderId);
    toast.success("Recharge approved");
    setRefreshKey(v => v + 1);
  };

  const handleRejectRecharge = (orderId: string) => {
    rejectRechargeOrder(orderId);
    toast.success("Recharge rejected");
    setRefreshKey(v => v + 1);
  };

  const handleApproveWithdraw = (orderId: string) => {
    approveWithdrawOrder(orderId);
    toast.success("Withdrawal approved");
    setRefreshKey(v => v + 1);
  };

  const handleRejectWithdraw = (orderId: string) => {
    rejectWithdrawOrder(orderId);
    toast.success("Withdrawal rejected");
    setRefreshKey(v => v + 1);
  };

  const handleAdjustBalance = (user: UserSummary) => {
    const value = window.prompt(`Set balance for ${user.phone}`, String(user.balance));
    if (value === null) return;
    const newValue = Number(value);
    if (Number.isNaN(newValue)) return toast.error("Invalid amount");

    updateUser(user.id, { balance: newValue } as any);
    toast.success(`Balance updated for ${user.phone}`);
    setRefreshKey(v => v + 1);
  };

  const handleBanUser = (user: UserSummary) => {
    const next = !user.isBanned;
    updateUser(user.id, {
      isBanned: next,
      status: next ? "banned" : "active"
    } as any);

    toast.success(next ? `User ${user.phone} banned` : `User ${user.phone} unbanned`);
    setRefreshKey(v => v + 1);
  };

  const handleDeleteUser = (user: UserSummary) => {
    const confirmDelete = window.confirm(`Delete ${user.phone}?`);
    if (!confirmDelete) return;

    updateUser(user.id, {
      isDeleted: true,
      status: "deleted"
    } as any);

    toast.success(`User ${user.phone} marked as deleted`);
    setRefreshKey(v => v + 1);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate("/login");
  };

  const getStatusStyle = (status: string) => {
    if (status === "completed") return { background: "rgba(201,168,76,0.1)", color: "#c9a84c" };
    if (status === "pending") return { background: "rgba(251,191,36,0.1)", color: "#fbbf24" };
    return { background: "rgba(239,68,68,0.1)", color: "#ef4444" };
  };

  const barStats = [
    { label: "Active Users", value: users.filter(u => !u.isBanned && !u.isDeleted).length, max: Math.max(users.length, 1) },
    { label: "Banned", value: users.filter(u => u.isBanned).length, max: Math.max(users.length, 1) },
    { label: "Deleted", value: users.filter(u => u.isDeleted).length, max: Math.max(users.length, 1) },
  ];

  return (
    <div className="app-container min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="flex items-center justify-between p-4" style={{ background: "#111111", borderBottom: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-[#c9a84c]" />
          <span className="text-white font-black text-lg">Advanced Admin Dashboard</span>
          <span className="text-[9px] font-bold text-black px-2 py-0.5 rounded-full gold-gradient ml-1">LEGEND</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(v => v + 1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#1b1b1b", border: "1px solid #2a2a2a" }}
          >
            <RefreshCw size={15} className="text-gray-300" />
          </button>
          <button onClick={handleLogout} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1e1e1e" }}>
            <LogOut size={15} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-4 pb-8">
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total Users", value: users.length, color: "#c9a84c", icon: Users },
                { label: "Platform Balance", value: formatUGX(totalBalance), color: "#f0c040", icon: Wallet },
                { label: "Pending Recharge", value: pendingRecharge.length, color: "#fbbf24", icon: CreditCard },
                { label: "Pending Withdraw", value: pendingWithdraw.length, color: "#f87171", icon: ArrowDownToLine },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-[11px]">{stat.label}</p>
                        <p className="text-2xl font-black mt-2" style={{ color: stat.color }}>{stat.value}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.08)" }}>
                        <Icon size={18} className="text-[#c9a84c]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white font-bold text-sm">User Distribution</p>
                  <div className="flex items-center gap-2 text-gray-500 text-[10px]">
                    <Filter size={12} /> status filter
                  </div>
                </div>

                <div className="space-y-3">
                  {barStats.map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="h-2.5 rounded-full" style={{ background: "#1e1e1e" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.value / item.max) * 100}%`,
                            background:
                              item.label === "Active Users"
                                ? "#22c55e"
                                : item.label === "Banned"
                                  ? "#ef4444"
                                  : "#f0c040"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid rgba(201,168,76,0.2)" }}>
                <p className="text-white font-bold text-sm mb-3">Quick Summary</p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #222" }}>
                    <span className="text-gray-500">Total Completed Recharges</span>
                    <span className="text-[#c9a84c] font-bold">{formatUGX(totalRecharge)}</span>
                  </div>

                  <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #222" }}>
                    <span className="text-gray-500">Total Completed Withdrawals</span>
                    <span className="text-white font-bold">{formatUGX(totalWithdrawn)}</span>
                  </div>

                  <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #222" }}>
                    <span className="text-gray-500">Active Gift Codes</span>
                    <span className="text-green-400 font-bold">{getGiftCodes().filter(c => !c.usedBy).length}</span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Open Reset Requests</span>
                    <span className="text-yellow-400 font-bold">{pendingResets.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <p className="text-white font-bold text-sm mb-3">Recent Recharge Orders</p>
                <div className="space-y-2">
                  {rechargeOrders.slice(0, 4).map((order: any) => (
                    <div key={order.id} className="rounded-xl p-2.5" style={{ background: "#1d1d1d", border: "1px solid #2a2a2a" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-xs font-semibold">{formatUGX(order.amount)}</p>
                          <p className="text-gray-500 text-[10px]">{order.phoneNumber}</p>
                        </div>
                        <span className="text-[9px] px-2 py-1 rounded-full font-medium" style={getStatusStyle(order.status)}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <p className="text-white font-bold text-sm mb-3">Recent Withdraw Orders</p>
                <div className="space-y-2">
                  {withdrawOrders.slice(0, 4).map((order: any) => (
                    <div key={order.id} className="rounded-xl p-2.5" style={{ background: "#1d1d1d", border: "1px solid #2a2a2a" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-xs font-semibold">{formatUGX(order.amount)}</p>
                          <p className="text-gray-500 text-[10px]">{order.bankCard?.bank || "Bank"}</p>
                        </div>
                        <span className="text-[9px] px-2 py-1 rounded-full font-medium" style={getStatusStyle(order.status)}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
                  <Search size={14} className="text-gray-500" />
                  <input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search by phone, name or referral..."
                    className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                    style={{ background: "#1a1a1a", border: "1px solid #333" }}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                    <option value="deleted">Deleted</option>
                  </select>

                  <select
                    value={sortKey}
                    onChange={e => setSortKey(e.target.value as SortKey)}
                    className="rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                    style={{ background: "#1a1a1a", border: "1px solid #333" }}
                  >
                    <option value="createdAt">Sort: Joined</option>
                    <option value="balance">Sort: Balance</option>
                    <option value="phone">Sort: Phone</option>
                    <option value="referralCode">Sort: Referral</option>
                    <option value="teamSize">Sort: Team</option>
                  </select>

                  <button
                    onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                    className="rounded-xl px-3 py-2.5 text-sm text-white"
                    style={{ background: "#1a1a1a", border: "1px solid #333" }}
                  >
                    {sortDir === "asc" ? "Asc" : "Desc"}
                  </button>

                  <button onClick={exportUsersCSV} className="rounded-xl px-3 py-2.5 text-sm text-black font-bold gold-gradient">
                    <Download size={14} className="inline mr-1" />
                    Export
                  </button>
                </div>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={bulkBan} className="rounded-xl px-3 py-2 text-xs font-semibold text-white" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    Ban Selected ({selectedIds.length})
                  </button>
                  <button onClick={bulkDelete} className="rounded-xl px-3 py-2 text-xs font-semibold text-red-300" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    Delete Selected ({selectedIds.length})
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead style={{ background: "#1a1a1a" }}>
                    <tr className="text-gray-400">
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === filteredUsers.length}
                          onChange={() => {
                            if (selectedIds.length === filteredUsers.length) {
                              setSelectedIds([]);
                            } else {
                              setSelectedIds(filteredUsers.map(u => u.id));
                            }
                          }}
                          className="accent-[#c9a84c]"
                        />
                      </th>
                      <th className="px-3 py-3">User</th>
                      <th className="px-3 py-3">Balance</th>
                      <th className="px-3 py-3">Referral</th>
                      <th className="px-3 py-3">Team</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} style={{ borderTop: "1px solid #1f1f1f" }}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                            className="accent-[#c9a84c]"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c" }}>
                              {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.phone.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-semibold text-xs">{user.fullName || user.phone}</p>
                              <p className="text-gray-500 text-[10px]">{user.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-[#c9a84c] font-bold">{formatUGX(user.balance)}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-white text-xs">{user.referralCode}</p>
                          <p className="text-gray-500 text-[10px]">{user.referredBy ? `By ${user.referredBy}` : "Starter"}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-white text-xs">{user.teamSize}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[9px] px-2 py-1 rounded-full font-bold"
                            style={
                              user.isBanned
                                ? { background: "rgba(239,68,68,0.12)", color: "#ef4444" }
                                : user.isDeleted
                                  ? { background: "rgba(148,163,184,0.12)", color: "#cbd5e1" }
                                  : { background: "rgba(34,197,94,0.12)", color: "#22c55e" }
                            }
                          >
                            {user.isBanned ? "BANNED" : user.isDeleted ? "DELETED" : "ACTIVE"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedUser(user)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1d1d1d" }}>
                              <Eye size={13} className="text-gray-300" />
                            </button>
                            <button onClick={() => handleAdjustBalance(user)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1d1d1d" }}>
                              <Wallet size={13} className="text-[#c9a84c]" />
                            </button>
                            <button onClick={() => handleBanUser(user)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1d1d1d" }}>
                              {user.isBanned ? <UserCheck size={13} className="text-green-400" /> : <UserX size={13} className="text-red-400" />}
                            </button>
                            <button onClick={() => handleDeleteUser(user)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1d1d1d" }}>
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-gray-600 text-sm">No users match your filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "recharge" && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
              <p className="text-gray-500 text-xs">{rechargeOrders.length} total orders — {pendingRecharge.length} pending</p>
            </div>

            {rechargeOrders.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <p className="text-gray-600 text-sm">No recharge orders</p>
              </div>
            ) : (
              rechargeOrders.map((order: any) => {
                const user = getUsers().find((u: any) => u.id === order.userId);

                return (
                  <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-black text-lg">{formatUGX(order.amount)}</p>
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

                        <p className="text-gray-400 text-xs font-medium mt-1">{user?.phone || "Unknown user"}</p>

                        <div className="mt-3 rounded-xl p-2.5 space-y-1.5" style={{ background: "#1e1e1e", border: "1px solid #333" }}>
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
                            </>
                          )}
                        </div>

                        <p className="text-gray-600 text-[10px] mt-2">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="flex flex-col gap-2 lg:min-w-[200px]">
                        <span className="text-[10px] px-2 py-1 rounded-full font-medium self-end" style={getStatusStyle(order.status)}>
                          {order.status}
                        </span>

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
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "withdraw" && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
              <p className="text-gray-500 text-xs">{withdrawOrders.length} total — {pendingWithdraw.length} pending</p>
            </div>

            {withdrawOrders.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <p className="text-gray-600 text-sm">No withdrawal orders</p>
              </div>
            ) : (
              withdrawOrders.map((order: any) => {
                const user = getUsers().find((u: any) => u.id === order.userId);

                return (
                  <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-white font-black text-lg">{formatUGX(order.amount)}</p>
                        <p className="text-gray-400 text-xs">{user?.phone || "Unknown"}</p>
                        <p className="text-gray-500 text-xs mt-1">{order.bankCard?.bank} — {order.bankCard?.accountNumber}</p>
                        <p className="text-gray-500 text-xs">Received: {formatUGX(order.receivedAmount)} (fee: {formatUGX(order.fee)})</p>
                        <p className="text-gray-600 text-[10px] mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] px-2 py-1 rounded-full font-medium self-end" style={getStatusStyle(order.status)}>
                          {order.status}
                        </span>

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
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "products" && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl p-3 text-center" style={{ background: "#1d1d1d" }}>
                  <p className="text-[#c9a84c] font-black text-2xl">{userProducts.length}</p>
                  <p className="text-gray-600 text-[10px]">Total Purchases</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "#1d1d1d" }}>
                  <p className="text-green-400 font-black text-2xl">{userProducts.filter((p: any) => p.status === "active").length}</p>
                  <p className="text-gray-600 text-[10px]">Active</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "#1d1d1d" }}>
                  <p className="text-gray-400 font-black text-2xl">{userProducts.filter((p: any) => p.status === "expired").length}</p>
                  <p className="text-gray-600 text-[10px]">Expired</p>
                </div>
              </div>
            </div>

            {PRODUCTS.map((product: any) => {
              const purchases = userProducts.filter((p: any) => p.productId === product.id);
              const activeCount = purchases.filter((p: any) => p.status === "active").length;

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
            <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
              <p className="text-gray-500 text-xs">{passwordResets.length} total requests — {pendingResets.length} pending</p>
            </div>

            {passwordResets.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <p className="text-gray-600 text-sm">No password reset requests</p>
              </div>
            ) : (
              passwordResets.map((req: any) => (
                <div key={req.id} className="rounded-2xl p-4" style={{ background: "#151515", border: `1px solid ${req.status === "pending" ? "rgba(245,158,11,0.35)" : "#2a2a2a"}` }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-bold text-sm">{req.phone}</p>
                      <p className="text-gray-500 text-xs">{new Date(req.createdAt).toLocaleString()}</p>
                    </div>

                    <span className="text-[10px] px-2 py-1 rounded-full font-bold"
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
                    </div>
                  )}

                  {req.status === "pending" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          approvePasswordReset(req.id);
                          toast.success(`Password reset approved for ${req.phone}`);
                          setRefreshKey(v => v + 1);
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
                          setRefreshKey(v => v + 1);
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
            users={users as any}
            rechargeOrders={rechargeOrders as any}
            withdrawOrders={withdrawOrders as any}
            onRefresh={() => setRefreshKey(v => v + 1)}
          />
        )}
      </div>

      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}