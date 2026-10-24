import { useState, useEffect } from "react";
import {
  Users, CreditCard, ArrowDownToLine, BarChart3, Check, X, Search,
  LogOut, Shield, TrendingUp, Gift, Bell, DollarSign, Trash2, Eye, Edit3, UserX
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
  const [allUsersRaw, setAllUsersRaw] = useState<any[]>([]);
  const [rechargeOrders, setRechargeOrders] = useState<any[]>([]);
  const [withdrawOrders, setWithdrawOrders] = useState<any[]>([]);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [giftCodes, setGiftCodes] = useState<any[]>([]);
  const [passwordResets, setPasswordResets] = useState<any[]>([]);
  const [newGiftAmount, setNewGiftAmount] = useState("");
  const [newGiftCode, setNewGiftCode] = useState("");
  const [selectedTeamUser, setSelectedTeamUser] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      let { data: allUsers } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (!allUsers || allUsers.length === 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        allUsers = profiles as any;
      }
      const usersList = allUsers || [];
      setAllUsersRaw(usersList);

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

      const allRecharge = recharges || [];
      const allWithdraw = withdraws || [];
      const allProducts = products || [];

      const summaries = usersList.filter((u: any) => !u.is_admin && !u.isAdmin).map((u: any) => {
        const teamMembers = usersList.filter((x: any) => 
          x.referred_by === u.id || x.referrer_id === u.id || x.referred_by_code === u.referral_code
        );

        const userRecharges = allRecharge.filter((r: any) => r.user_id === u.id && r.status === 'completed');
        const userWithdraws = allWithdraw.filter((w: any) => w.user_id === u.id && w.status === 'completed');
        const userProds = allProducts.filter((p: any) => p.user_id === u.id);

        return {
          id: u.id,
          phone: u.phone,
          name: u.name || u.phone,
          balance: Number(u.balance || 0),
          referralCode: u.referral_code || "",
          referredBy: u.referred_by || u.referrer_id || "",
          referredByCode: u.referred_by_code || "",
          createdAt: u.created_at,
          isBanned: !!u.is_banned,
          totalDeposited: userRecharges.reduce((s: number, r: any) => s + Number(r.amount), 0),
          totalWithdrawn: userWithdraws.reduce((s: number, w: any) => s + Number(w.amount), 0),
          activePackages: userProds.filter((p: any) => p.status === 'active').length,
          totalPackages: userProds.length,
          teamCount: teamMembers.length,
          teamMembers: teamMembers
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
  const filteredUsers = users.filter(u => `${u.phone} ${u.name} ${u.referralCode}`.toLowerCase().includes(searchQ.toLowerCase()));

  const handleApproveRecharge = async (orderId: string) => {
    const order = rechargeOrders.find(o => o.id === orderId);
    if (!order) return;
    await supabase.from('recharge_orders').update({ status: 'completed' }).eq('id', orderId);
    const { data } = await supabase.from('users').select('balance').eq('id', order.user_id).single();
    if (data) await supabase.from('users').update({ balance: Number(data.balance) + Number(order.amount) }).eq('id', order.user_id);
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
    const value = window.prompt(`ADJUST BALANCE\nCurrent: ${formatUGX(user.balance)}\nEnter NEW balance for ${user.phone}:`, String(user.balance));
    if (value === null) return;
    const newValue = Number(value);
    if (isNaN(newValue)) { toast.error("Invalid amount"); return; }
    const { error } = await supabase.from('users').update({ balance: newValue }).eq('id', user.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Balance updated: ${formatUGX(newValue)}`);
      setRefreshKey(v => v + 1);
    }
  };

  const handleBanUser = async (user: any) => {
    await supabase.from('users').update({ is_banned: !user.isBanned }).eq('id', user.id);
    toast.success(user.isBanned ? "Unbanned" : "Banned");
    setRefreshKey(v => v + 1);
  };

  const handleDeleteUser = async (user: any) => {
    const confirm1 = window.confirm(`DELETE USER ${user.phone}?\nThis will delete:\n- User account\n- Recharge & Withdraw orders\n- Products\n\nAre you sure?`);
    if (!confirm1) return;
    const confirm2 = window.confirm(`Type YES: Really delete ${user.phone} permanently?`);
    if (!confirm2) return;
    
    await supabase.from('recharge_orders').delete().eq('user_id', user.id);
    await supabase.from('withdraw_orders').delete().eq('user_id', user.id);
    await supabase.from('user_products').delete().eq('user_id', user.id);
    await supabase.from('transactions').delete().eq('user_id', user.id);
    const { error } = await supabase.from('users').delete().eq('id', user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("User deleted");
      setRefreshKey(v => v + 1);
    }
  };

  const handleCreateGift = async () => {
    if (!newGiftCode.trim() || !newGiftAmount) { toast.error("Enter code and amount"); return; }
    const { error } = await supabase.from('gift_codes').insert({ code: newGiftCode.trim().toUpperCase(), amount: Number(newGiftAmount), is_used: false });
    if (error) toast.error(error.message);
    else {
      toast.success(`Gift ${newGiftCode} created`);
      setNewGiftCode(""); setNewGiftAmount(""); setRefreshKey(v => v + 1);
    }
  };

  const handleDeleteGift = async (id: string) => {
    await supabase.from('gift_codes').delete().eq('id', id);
    toast.success("Gift deleted"); setRefreshKey(v => v + 1);
  };

  const redeemGiftCode = async (code: string, userId: string) => {
    const { data: gift } = await supabase.from('gift_codes').select('*').eq('code', code.toUpperCase()).eq('is_used', false).single();
    if (!gift) { toast.error("Invalid or used"); return; }
    const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
    if (user) {
      await supabase.from('users').update({ balance: Number(user.balance) + Number(gift.amount) }).eq('id', userId);
      await supabase.from('gift_codes').update({ is_used: true, used_by: userId }).eq('id', gift.id);
      toast.success(`Redeemed ${formatUGX(gift.amount)}`); setRefreshKey(v => v + 1);
    }
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
              <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-3xl font-black text-green-400">{userProducts.filter((p: any) => p.status === "active").length}</p><p className="text-gray-500 text-xs">Active Products</p></div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-gray-500 text-xs">Total Platform Balance</p><p className="text-[#c9a84c] text-2xl font-black">{formatUGX(totalBalance)}</p></div>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
              <Search size={14} className="text-gray-500" /><input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search phone or referral..." className="flex-1 bg-transparent outline-none text-sm text-white" />
            </div>
            
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <div className="flex justify-between items-start">
                  <div><p className="text-white font-bold text-sm">{user.phone}</p><p className="text-gray-500 text-[11px]">{user.name}</p></div>
                  <span className="text-[10px] font-bold text-black px-2 py-0.5 rounded-full" style={{background:"#c9a84c"}}>{user.referralCode}</span>
                </div>
                <p className="text-gray-500 text-[10px] mt-1">Referred by: {users.find(u=>u.id===user.referredBy)?.phone || user.referredByCode || "Direct"} • Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                
                {/* STATS RESTORED: Balance, Deposited, Withdrawn, Active Packages, Team */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl p-2.5" style={{ background: "#1e1e1e" }}><p className="text-[#c9a84c] font-bold text-sm">{formatUGX(user.balance)}</p><p className="text-gray-600 text-[10px]">Current Balance</p></div>
                  <div className="rounded-xl p-2.5" style={{ background: "#1e1e1e" }}><p className="text-white font-bold text-sm">{formatUGX(user.totalDeposited)}</p><p className="text-gray-600 text-[10px]">Total Deposited</p></div>
                  <div className="rounded-xl p-2.5" style={{ background: "#1e1e1e" }}><p className="text-red-400 font-bold text-sm">{formatUGX(user.totalWithdrawn)}</p><p className="text-gray-600 text-[10px]">Total Withdrawal</p></div>
                  <div className="rounded-xl p-2.5" style={{ background: "#1e1e1e" }}><p className="text-green-400 font-bold text-sm">{user.activePackages} / {user.totalPackages}</p><p className="text-gray-600 text-[10px]">Active / Total Packages</p></div>
                </div>

                <div className="rounded-xl p-2.5 mt-2 flex justify-between items-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <div><p className="text-green-400 font-bold text-sm">{user.teamCount} members</p><p className="text-gray-500 text-[10px]">Team via referral {user.referralCode}</p></div>
                  <button onClick={() => setSelectedTeamUser(user)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-green-500/20 text-green-400 flex items-center gap-1"><Eye size={12}/> View Team</button>
                </div>

                {/* ACTION BUTTONS RESTORED: Adjust, Ban, Delete */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <button onClick={() => handleAdjustBalance(user)} className="py-2.5 rounded-xl text-[10px] font-bold text-black flex items-center justify-center gap-1" style={{background:"#c9a84c"}}><Edit3 size={12}/> Adjust</button>
                  <button onClick={() => handleBanUser(user)} className="py-2.5 rounded-xl text-[10px] font-bold text-white" style={{ background: user.isBanned ? "#22c55e20" : "rgba(239,68,68,0.15)", color: user.isBanned ? "#22c55e" : "#ef4444" }}>{user.isBanned ? "Unban" : "Ban"}</button>
                  <button onClick={() => handleDeleteUser(user)} className="py-2.5 rounded-xl text-[10px] font-bold text-red-400 flex items-center justify-center gap-1" style={{ background: "rgba(239,68,68,0.1)" }}><Trash2 size={12}/> Delete</button>
                  <button onClick={() => { const code = window.prompt("Enter gift code to redeem for this user:"); if(code) redeemGiftCode(code, user.id); }} className="py-2.5 rounded-xl text-[10px] font-bold text-white" style={{ background: "#2a2a2a" }}><Gift size={12} className="inline mr-1"/> Gift</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TEAM MODAL - View who joined by referral code */}
        {selectedTeamUser && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setSelectedTeamUser(null)}>
            <div className="w-full max-w-md bg-[#151515] rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ borderTop: "1px solid #2a2a2a" }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold">Team of {selectedTeamUser.phone}</h3>
                <button onClick={() => setSelectedTeamUser(null)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><X size={14} className="text-white"/></button>
              </div>
              <p className="text-gray-500 text-xs mb-3">Referral Code: <span className="text-[#c9a84c] font-bold">{selectedTeamUser.referralCode}</span> • {selectedTeamUser.teamCount} members joined via this code</p>
              <div className="space-y-2">
                {selectedTeamUser.teamMembers.map((m: any) => (
                  <div key={m.id} className="rounded-xl p-3 flex justify-between" style={{ background: "#1e1e1e" }}>
                    <div><p className="text-white text-sm font-semibold">{m.phone}</p><p className="text-gray-500 text-xs">{formatUGX(m.balance)} • {new Date(m.created_at).toLocaleDateString()}</p></div>
                    <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full h-fit">Level 1</span>
                  </div>
                ))}
                {selectedTeamUser.teamMembers.length === 0 && <p className="text-gray-600 text-sm text-center py-6">No one joined with this code yet</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "recharge" && (
          <div className="space-y-3">
            {rechargeOrders.map((order: any) => (
              <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515" }}>
                <div className="flex justify-between"><p className="text-white font-bold">{formatUGX(order.amount)}</p><span className="text-[10px] px-2 py-1 rounded-full" style={{background: order.status==='pending'?'rgba(251,191,36,0.1)':'rgba(34,197,94,0.1)', color: order.status==='pending'?'#fbbf24':'#22c55e'}}>{order.status}</span></div>
                <p className="text-gray-400 text-xs mt-1">{users.find(u=>u.id===order.user_id)?.phone || order.user_id}</p>
                {order.status === "pending" && <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => handleApproveRecharge(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-black" style={{background:"#c9a84c"}}>Approve</button><button onClick={() => handleRejectRecharge(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}>Reject</button></div>}
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
                <input value={newGiftCode} onChange={e => setNewGiftCode(e.target.value.toUpperCase())} placeholder="Code e.g. LEGEND100" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-white" />
                <input value={newGiftAmount} onChange={e => setNewGiftAmount(e.target.value)} type="number" placeholder="Amount e.g. 5000" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-white" />
                <button onClick={handleCreateGift} className="w-full py-3 rounded-xl font-bold text-black" style={{background:"#c9a84c"}}>Create Gift</button>
              </div>
            </div>
            <div className="space-y-2">
              {giftCodes.map((g: any) => (
                <div key={g.id} className="rounded-xl p-3 flex justify-between" style={{ background: "#151515" }}>
                  <div><p className="text-white font-bold text-sm">{g.code}</p><p className="text-gray-500 text-xs">{formatUGX(g.amount)} • {g.is_used ? 'Used' : 'Active'}</p></div>
                  <button onClick={() => handleDeleteGift(g.id)} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center"><Trash2 size={12} className="text-red-400" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "resets" && (
          <div className="space-y-3">
            {passwordResets.map((r: any) => (
              <div key={r.id} className="rounded-2xl p-4" style={{ background: "#151515" }}>
                <div className="flex justify-between"><p className="text-white font-bold text-sm">{r.phone}</p><span className="text-[10px] px-2 py-1 rounded-full" style={{background: r.status==='pending'?'rgba(251,191,36,0.1)':'rgba(34,197,94,0.1)'}}>{r.status}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}