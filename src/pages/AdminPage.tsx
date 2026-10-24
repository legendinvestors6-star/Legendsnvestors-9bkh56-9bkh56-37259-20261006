import { useState, useEffect } from "react";
import {
  Users, CreditCard, ArrowDownToLine, BarChart3, Check, X, Search,
  LogOut, Shield, TrendingUp, Gift, Bell, DollarSign, Trash2, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const formatUGX = (n: number) => `UGX ${Number(n||0).toLocaleString()}`;

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [searchQ, setSearchQ] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [rechargeOrders, setRechargeOrders] = useState<any[]>([]);
  const [withdrawOrders, setWithdrawOrders] = useState<any[]>([]);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [giftCodes, setGiftCodes] = useState<any[]>([]);
  const [passwordResets, setPasswordResets] = useState<any[]>([]);
  const [newGiftAmount, setNewGiftAmount] = useState("");
  const [newGiftCode, setNewGiftCode] = useState("");

  useEffect(() => {
    const loadData = async () => {
      let { data: allUsers } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (!allUsers || allUsers.length === 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        allUsers = profiles as any;
      }

      const [
        { data: recharges },
        { data: withdraws },
        { data: products },
        { data: gifts },
        { data: resets }
      ] = await Promise.all([
        supabase.from('recharge_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('withdraw_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('user_products').select('*'),
        supabase.from('gift_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('password_resets').select('*').order('created_at', { ascending: false })
      ]);

      const usersList = allUsers || [];
      const allRecharge = recharges || [];
      const allWithdraw = withdraws || [];
      const allProducts = products || [];

      const summaries = usersList.filter((u: any) => !u.is_admin && !u.isAdmin).map((u: any) => {
        const teamCount = usersList.filter((x: any) => 
          x.referred_by === u.id || 
          x.referrer_id === u.id ||
          x.referred_by_code === u.referral_code
        ).length;

        const userRecharges = allRecharge.filter((r: any) => r.user_id === u.id && r.status === 'completed');
        const userWithdraws = allWithdraw.filter((w: any) => w.user_id === u.id && w.status === 'completed');
        const userProds = allProducts.filter((p: any) => p.user_id === u.id);

        return {
          id: u.id,
          phone: u.phone,
          balance: Number(u.balance || 0),
          referralCode: u.referral_code || "",
          referredBy: u.referred_by || u.referrer_id || u.referred_by_code || "",
          createdAt: u.created_at,
          isBanned: !!u.is_banned,
          totalDeposited: userRecharges.reduce((s: number, r: any) => s + Number(r.amount), 0),
          totalWithdrawn: userWithdraws.reduce((s: number, w: any) => s + Number(w.amount), 0),
          activePackages: userProds.filter((p: any) => p.status === 'active').length,
          teamCount
        };
      });

      setUsers(summaries);
      setRechargeOrders(allRecharge);
      setWithdrawOrders(allWithdraw);
      setUserProducts(allProducts);
      setGiftCodes(gifts || []);
      setPasswordResets(resets || []);
    };
    loadData();
  }, [refreshKey]);

  const pendingRecharge = rechargeOrders.filter((o: any) => o.status === "pending");
  const pendingWithdraw = withdrawOrders.filter((o: any) => o.status === "pending");
  const pendingResets = passwordResets.filter((r: any) => r.status === "pending");
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);
  const filteredUsers = users.filter(u => `${u.phone} ${u.referralCode}`.toLowerCase().includes(searchQ.toLowerCase()));

  const handleApproveRecharge = async (orderId: string) => {
    const order = rechargeOrders.find(o => o.id === orderId);
    if (!order) return;
    await supabase.from('recharge_orders').update({ status: 'completed' }).eq('id', orderId);
    const { data } = await supabase.from('users').select('balance').eq('id', order.user_id).single();
    if (data) await supabase.from('users').update({ balance: Number(data.balance) + Number(order.amount) }).eq('id', order.user_id);
    await supabase.from('transactions').insert({ user_id: order.user_id, type: 'recharge', amount: order.amount, status: 'completed' });
    toast.success("Recharge approved");
    setRefreshKey(v => v + 1);
  };

  const handleRejectRecharge = async (orderId: string) => {
    await supabase.from('recharge_orders').update({ status: 'rejected' }).eq('id', orderId);
    toast.success("Rejected");
    setRefreshKey(v => v + 1);
  };

  const handleApproveWithdraw = async (orderId: string) => {
    await supabase.from('withdraw_orders').update({ status: 'completed' }).eq('id', orderId);
    toast.success("Withdrawal approved");
    setRefreshKey(v => v + 1);
  };

  const handleRejectWithdraw = async (orderId: string) => {
    const order = withdrawOrders.find(o => o.id === orderId);
    if (order) {
      const { data } = await supabase.from('users').select('balance').eq('id', order.user_id).single();
      if (data) await supabase.from('users').update({ balance: Number(data.balance) + Number(order.amount) }).eq('id', order.user_id);
    }
    await supabase.from('withdraw_orders').update({ status: 'rejected' }).eq('id', orderId);
    toast.success("Rejected & refunded");
    setRefreshKey(v => v + 1);
  };

  const handleAdjustBalance = async (user: any) => {
    const value = window.prompt(`Set new balance for ${user.phone}`, String(user.balance));
    if (value === null) return;
    await supabase.from('users').update({ balance: Number(value) }).eq('id', user.id);
    toast.success("Balance updated");
    setRefreshKey(v => v + 1);
  };

  const handleBanUser = async (user: any) => {
    await supabase.from('users').update({ is_banned: !user.isBanned }).eq('id', user.id);
    toast.success(user.isBanned ? "Unbanned" : "Banned");
    setRefreshKey(v => v + 1);
  };

  // ===== TOOLS / GIFT CODE LOGIC (RESTORED) =====
  const handleCreateGift = async () => {
    if (!newGiftCode.trim() || !newGiftAmount) {
      toast.error("Enter code and amount");
      return;
    }
    const { error } = await supabase.from('gift_codes').insert({
      code: newGiftCode.trim().toUpperCase(),
      amount: Number(newGiftAmount),
      is_used: false
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Gift ${newGiftCode} - ${formatUGX(Number(newGiftAmount))} created`);
      setNewGiftCode("");
      setNewGiftAmount("");
      setRefreshKey(v => v + 1);
    }
  };

  const handleDeleteGift = async (id: string) => {
    await supabase.from('gift_codes').delete().eq('id', id);
    toast.success("Gift deleted");
    setRefreshKey(v => v + 1);
  };

  // REDEEM GIFT CODE - The function you said was removed
  const redeemGiftCode = async (code: string, userId: string) => {
    const { data: gift } = await supabase.from('gift_codes').select('*').eq('code', code.toUpperCase()).eq('is_used', false).single();
    if (!gift) {
      toast.error("Invalid or used code");
      return;
    }
    const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
    if (user) {
      await supabase.from('users').update({ balance: Number(user.balance) + Number(gift.amount) }).eq('id', userId);
      await supabase.from('gift_codes').update({ is_used: true, used_by: userId }).eq('id', gift.id);
      await supabase.from('transactions').insert({ user_id: userId, type: 'gift', amount: gift.amount, description: `Gift ${code}` });
      toast.success(`Redeemed ${formatUGX(gift.amount)}`);
      setRefreshKey(v => v + 1);
    }
  };

  const handleApproveReset = async (resetId: string) => {
    const reset = passwordResets.find(r => r.id === resetId);
    if (!reset) return;
    await supabase.from('users').update({ password: reset.new_password }).eq('phone', reset.phone);
    await supabase.from('password_resets').update({ status: 'approved' }).eq('id', resetId);
    toast.success("Password reset approved");
    setRefreshKey(v => v + 1);
  };

  const handleRejectReset = async (resetId: string) => {
    await supabase.from('password_resets').update({ status: 'rejected' }).eq('id', resetId);
    toast.success("Reset rejected");
    setRefreshKey(v => v + 1);
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users, badge: users.length },
    { key: "recharge", label: "Recharge", icon: CreditCard, badge: pendingRecharge.length },
    { key: "withdraw", label: "Withdraw", icon: ArrowDownToLine, badge: pendingWithdraw.length },
    { key: "gifts", label: "Tools", icon: Gift, badge: giftCodes.filter((g: any) => !g.is_used).length },
    { key: "resets", label: "Resets", icon: Bell, badge: pendingResets.length },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="flex items-center justify-between p-4" style={{ background: "#111", borderBottom: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2"><Shield size={18} className="text-[#c9a84c]" /><span className="text-white font-black text-lg">Admin Panel</span></div>
        <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#1e1e1e" }}><LogOut size={15} className="text-gray-400" /></button>
      </div>

      <div className="flex gap-0 overflow-x-auto" style={{ background: "#111", borderBottom: "1px solid #1a1a1a" }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key as any)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-semibold relative" style={tab === t.key ? { color: "#c9a84c", borderBottom: "2px solid #c9a84c" } : { color: "#555" }}>
              <Icon size={13} />{t.label}{(t as any).badge > 0 && <span className="absolute top-1.5 right-1 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center" style={{background:"#c9a84c"}}>{(t as any).badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="p-4 pb-8">
        {tab === "overview" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-3xl font-black text-[#c9a84c]">{users.length}</p><p className="text-gray-500 text-xs">Total Users</p></div>
              <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-3xl font-black text-yellow-400">{pendingRecharge.length}</p><p className="text-gray-500 text-xs">Pending Recharge</p></div>
              <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-3xl font-black text-red-400">{pendingWithdraw.length}</p><p className="text-gray-500 text-xs">Pending Withdraw</p></div>
              <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-3xl font-black text-green-400">{users.filter(u=>u.teamCount>0).length}</p><p className="text-gray-500 text-xs">With Referrals</p></div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-gray-500 text-xs">Total Platform Balance</p><p className="text-[#c9a84c] text-2xl font-black">{formatUGX(totalBalance)}</p></div>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
              <Search size={14} className="text-gray-500" /><input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search phone or referral code..." className="flex-1 bg-transparent outline-none text-sm text-white" />
            </div>
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <div className="flex justify-between"><p className="text-white font-bold text-sm">{user.phone}</p><span className="text-[10px] font-bold text-black px-2 py-0.5 rounded-full" style={{background:"#c9a84c"}}>{user.referralCode}</span></div>
                <p className="text-gray-500 text-[10px] mt-1">Referred by: {users.find(u=>u.id===user.referredBy)?.phone || user.referredBy || "Direct"}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="rounded-xl p-2 text-center" style={{ background: "#1e1e1e" }}><p className="text-[#c9a84c] font-bold text-sm">{formatUGX(user.balance)}</p><p className="text-gray-600 text-[10px]">Balance</p></div>
                  <div className="rounded-xl p-2 text-center" style={{ background: "#1e1e1e" }}><p className="text-white font-bold text-sm">{formatUGX(user.totalDeposited)}</p><p className="text-gray-600 text-[10px]">Deposited</p></div>
                  <div className="rounded-xl p-2 text-center" style={{ background: "#1e1e1e" }}><p className="text-green-400 font-bold text-sm">{user.teamCount}</p><p className="text-gray-600 text-[10px]">Team</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button onClick={() => handleAdjustBalance(user)} className="py-2 rounded-xl text-[10px] font-semibold text-black" style={{background:"#c9a84c"}}>Adjust</button>
                  <button onClick={() => handleBanUser(user)} className="py-2 rounded-xl text-[10px] font-semibold text-white" style={{ background: user.isBanned ? "#1c1c1c" : "rgba(239,68,68,0.2)" }}>{user.isBanned ? "Unban" : "Ban"}</button>
                  <button onClick={() => redeemGiftCode(window.prompt("Enter gift code to redeem for this user:")||"", user.id)} className="py-2 rounded-xl text-[10px] font-semibold text-white" style={{ background: "#2a2a2a" }}>Gift</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "recharge" && (
          <div className="space-y-3">
            {rechargeOrders.map((order: any) => (
              <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515" }}>
                <div className="flex justify-between"><p className="text-white font-bold">{formatUGX(order.amount)}</p><span className="text-[10px] px-2 py-1 rounded-full" style={{background: order.status==='pending'?'rgba(251,191,36,0.1)':'rgba(34,197,94,0.1)', color: order.status==='pending'?'#fbbf24':'#22c55e'}}>{order.status}</span></div>
                <p className="text-gray-400 text-xs mt-1">{users.find(u=>u.id===order.user_id)?.phone || order.user_id}</p>
                {order.status === "pending" && <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => handleApproveRecharge(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1" style={{background:"#c9a84c"}}><Check size={13}/> Approve</button><button onClick={() => handleRejectRecharge(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}><X size={13}/> Reject</button></div>}
              </div>
            ))}
          </div>
        )}

        {tab === "withdraw" && (
          <div className="space-y-3">
            {withdrawOrders.map((order: any) => (
              <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515" }}>
                <div className="flex justify-between"><p className="text-white font-bold">{formatUGX(order.amount)}</p><span className="text-[10px] px-2 py-1 rounded-full" style={{background: order.status==='pending'?'rgba(251,191,36,0.1)':'rgba(34,197,94,0.1)', color: order.status==='pending'?'#fbbf24':'#22c55e'}}>{order.status}</span></div>
                <p className="text-gray-400 text-xs mt-1">{users.find(u=>u.id===order.user_id)?.phone}</p>
                {order.status === "pending" && <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => handleApproveWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-black" style={{background:"#c9a84c"}}>Approve</button><button onClick={() => handleRejectWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}>Reject & Refund</button></div>}
              </div>
            ))}
          </div>
        )}

        {tab === "gifts" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
              <h3 className="text-white font-bold mb-3">Create Gift Code</h3>
              <div className="space-y-3">
                <input value={newGiftCode} onChange={e => setNewGiftCode(e.target.value.toUpperCase())} placeholder="Gift Code e.g. LEGEND100" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm outline-none text-white" />
                <input value={newGiftAmount} onChange={e => setNewGiftAmount(e.target.value)} type="number" placeholder="Amount e.g. 5000" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm outline-none text-white" />
                <button onClick={handleCreateGift} className="w-full py-3 rounded-xl font-bold text-black text-sm" style={{background:"linear-gradient(135deg,#c9a84c,#f0c040)"}}>Create Gift Code</button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-bold text-sm">All Gift Codes ({giftCodes.length})</h3>
              {giftCodes.map((g: any) => (
                <div key={g.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                  <div><p className="text-white font-bold text-sm">{g.code}</p><p className="text-gray-500 text-xs">{formatUGX(g.amount)} • {g.is_used ? `Used by ${users.find(u=>u.id===g.used_by)?.phone || g.used_by}` : 'Unused'}</p></div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-full" style={{background: g.is_used ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: g.is_used ? "#ef4444" : "#22c55e"}}>{g.is_used ? "Used" : "Active"}</span>
                    <button onClick={() => handleDeleteGift(g.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"rgba(239,68,68,0.1)"}}><Trash2 size={12} className="text-red-400" /></button>
                  </div>
                </div>
              ))}
              {giftCodes.length === 0 && <p className="text-gray-600 text-sm text-center py-6">No gift codes yet</p>}
            </div>

            <div className="rounded-2xl p-4" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <p className="text-[#c9a84c] text-xs font-semibold">How redeemGiftCode works:</p>
              <p className="text-gray-400 text-xs mt-1">User goes to Profile &gt; Redeem Gift &gt; Enters code {`->`} Balance + amount. Admin can also redeem for user from Users tab &gt; Gift button.</p>
            </div>
          </div>
        )}

        {tab === "resets" && (
          <div className="space-y-3">
            {passwordResets.map((r: any) => (
              <div key={r.id} className="rounded-2xl p-4" style={{ background: "#151515" }}>
                <div className="flex justify-between"><p className="text-white font-bold text-sm">{r.phone}</p><span className="text-[10px] px-2 py-1 rounded-full" style={{background: r.status==='pending'?'rgba(251,191,36,0.1)':'rgba(34,197,94,0.1)', color: r.status==='pending'?'#fbbf24':'#22c55e'}}>{r.status}</span></div>
                <p className="text-gray-500 text-xs mt-1">Requested: {new Date(r.created_at).toLocaleString()}</p>
                {r.status === "pending" && <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => handleApproveReset(r.id)} className="py-2.5 rounded-xl text-xs font-bold text-black" style={{background:"#c9a84c"}}>Approve Reset</button><button onClick={() => handleRejectReset(r.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}>Reject</button></div>}
              </div>
            ))}
            {passwordResets.length === 0 && <p className="text-gray-600 text-sm text-center py-10">No password reset requests</p>}
          </div>
        )}
      </div>
    </div>
  );
}