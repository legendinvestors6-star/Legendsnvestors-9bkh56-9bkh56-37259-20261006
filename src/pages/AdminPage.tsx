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
      // FIX: Fetch users from both tables
      let { data: allUsers, error: userError } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      console.log('Users:', allUsers?.length, userError?.message);
      
      if (!allUsers || allUsers.length === 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        allUsers = profiles as any;
      }
      const usersList = allUsers || [];
      setAllUsersRaw(usersList);

      // FIX: Load ALL orders with error logs
      const { data: recharges, error: rechargeError } = await supabase.from('recharge_orders').select('*').order('created_at', { ascending: false });
      console.log('Recharges:', recharges?.length, rechargeError?.message);
      
      const { data: withdraws, error: withdrawError } = await supabase.from('withdraw_orders').select('*').order('created_at', { ascending: false });
      console.log('Withdraws:', withdraws?.length, withdrawError?.message);

      const [
        { data: products },
        { data: gifts },
        { data: resets }
      ] = await Promise.all([
        supabase.from('user_products').select('*'),
        supabase.from('gift_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('password_resets').select('*').order('created_at', { ascending: false })
      ]);

      const allRecharge = recharges || [];
      const allWithdraw = withdraws || [];
      const allProducts = products || [];

      // FIX: Consider both approved AND completed as deposited
      const isApproved = (s: string) => ['approved','completed','success'].includes((s||'').toLowerCase());

      const summaries = usersList.filter((u: any) => !u.is_admin && !u.isAdmin).map((u: any) => {
        const teamMembers = usersList.filter((x: any) => 
          x.referred_by === u.id || x.referrer_id === u.id || x.referred_by_code === u.referral_code
        );

        const userRecharges = allRecharge.filter((r: any) => r.user_id === u.id && isApproved(r.status));
        const userWithdraws = allWithdraw.filter((w: any) => w.user_id === u.id && isApproved(w.status));
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
    // FIX: Approve as completed AND add balance
    const { error: updErr } = await supabase.from('recharge_orders').update({ status: 'completed' }).eq('id', orderId);
    if (updErr) { toast.error(updErr.message); return; }
    
    const { data } = await supabase.from('users').select('balance').eq('id', order.user_id).maybeSingle();
    if (data) {
      await supabase.from('users').update({ balance: Number(data.balance) + Number(order.amount) }).eq('id', order.user_id);
    }
    toast.success(`Approved ${formatUGX(order.amount)} for ${order.phone || order.user_id}`);
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
      const { data } = await supabase.from('users').select('balance').eq('id', order.user_id).maybeSingle();
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
    const confirm1 = window.confirm(`DELETE USER ${user.phone}?`);
    if (!confirm1) return;
    await supabase.from('recharge_orders').delete().eq('user_id', user.id);
    await supabase.from('withdraw_orders').delete().eq('user_id', user.id);
    await supabase.from('user_products').delete().eq('user_id', user.id);
    const { error } = await supabase.from('users').delete().eq('id', user.id);
    if (error) toast.error(error.message);
    else { toast.success("User deleted"); setRefreshKey(v => v + 1); }
  };

  const handleCreateGift = async () => {
    if (!newGiftCode.trim() || !newGiftAmount) { toast.error("Enter code and amount"); return; }
    const { error } = await supabase.from('gift_codes').insert({ code: newGiftCode.trim().toUpperCase(), amount: Number(newGiftAmount), is_used: false, created_at: new Date().toISOString() });
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

  const tabs = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users, badge: users.length },
    { key: "recharge", label: "Recharge", icon: CreditCard, badge: pendingRecharge.length },
    { key: "withdraw", label: "Withdraw", icon: ArrowDownToLine, badge: pendingWithdraw.length },
    { key: "gifts", label: "Tools", icon: Gift },
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
              <Icon size={13} />{t.label}{(t as any).badge > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center" style={{background:"#c9a84c"}}>{(t as any).badge}</span>}
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
              <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-3xl font-black text-green-400">{rechargeOrders.length}</p><p className="text-gray-500 text-xs">All Recharges (incl. approved)</p></div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-gray-500 text-xs">Total Platform Balance</p><p className="text-[#c9a84c] text-2xl font-black">{formatUGX(totalBalance)}</p></div>
            <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-white font-bold mb-2">Debug Info</p><p className="text-gray-500 text-xs">Recharge orders in DB: {rechargeOrders.length}</p><p className="text-gray-500 text-xs">Withdraw orders in DB: {withdrawOrders.length}</p><p className="text-gray-500 text-xs">If 0 here, run SQL DISABLE RLS!</p></div>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
              <Search size={14} className="text-gray-500" /><input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search phone..." className="flex-1 bg-transparent outline-none text-sm text-white" />
            </div>
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-2xl p-4" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                <div className="flex justify-between items-start">
                  <div><p className="text-white font-bold text-sm">{user.phone}</p><p className="text-gray-500 text-[11px]">{user.name}</p></div>
                  <span className="text-[10px] font-bold text-black px-2 py-0.5 rounded-full" style={{background:"#c9a84c"}}>{user.referralCode}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl p-2.5" style={{ background: "#1e1e1e" }}><p className="text-[#c9a84c] font-bold text-sm">{formatUGX(user.balance)}</p><p className="text-gray-600 text-[10px]">Current Balance</p></div>
                  <div className="rounded-xl p-2.5" style={{ background: "#1e1e1e" }}><p className="text-white font-bold text-sm">{formatUGX(user.totalDeposited)}</p><p className="text-gray-600 text-[10px]">Total Deposited</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button onClick={() => handleAdjustBalance(user)} className="py-2.5 rounded-xl text-[10px] font-bold text-black" style={{background:"#c9a84c"}}>Adjust</button>
                  <button onClick={() => handleBanUser(user)} className="py-2.5 rounded-xl text-[10px] font-bold" style={{ background: user.isBanned ? "#22c55e20" : "rgba(239,68,68,0.15)", color: user.isBanned ? "#22c55e" : "#ef4444" }}>{user.isBanned ? "Unban" : "Ban"}</button>
                  <button onClick={() => handleDeleteUser(user)} className="py-2.5 rounded-xl text-[10px] font-bold text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "recharge" && (
          <div className="space-y-3">
            {rechargeOrders.length === 0 && <div className="rounded-2xl p-8 text-center" style={{ background: "#151515" }}><p className="text-gray-500 text-sm">No recharge orders found</p><p className="text-gray-600 text-xs mt-2">If you just recharged and don't see it, run SQL DISABLE RLS</p></div>}
            {rechargeOrders.map((order: any) => {
              const userPhone = users.find(u=>u.id===order.user_id)?.phone || order.phone || order.user_id?.slice(0,8);
              return (
                <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515", border: order.status==='pending'?'1px solid rgba(251,191,36,0.3)':'1px solid #222' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-bold text-base">{formatUGX(order.amount)}</p>
                      <p className="text-gray-300 text-xs mt-1">User: <span className="text-[#c9a84c] font-bold">{userPhone}</span></p>
                      <p className="text-gray-500 text-[11px]">Pay to: {order.phone_number} • {order.payment_method?.toUpperCase()} • {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{background: order.status==='pending'?'rgba(251,191,36,0.15)': order.status==='rejected'?'rgba(239,68,68,0.15)':'rgba(34,197,94,0.15)', color: order.status==='pending'?'#fbbf24': order.status==='rejected'?'#ef4444':'#22c55e'}}>{order.status.toUpperCase()}</span>
                  </div>
                  {order.status === "pending" && <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => handleApproveRecharge(order.id)} className="py-3 rounded-xl text-xs font-black text-black" style={{background:"#c9a84c"}}>✓ Approve & Add Balance</button><button onClick={() => handleRejectRecharge(order.id)} className="py-3 rounded-xl text-xs font-bold text-red-400" style={{ background: "rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)" }}>✕ Reject</button></div>}
                </div>
              );
            })}
          </div>
        )}

        {tab === "withdraw" && (
          <div className="space-y-3">
            {withdrawOrders.map((order: any) => (
              <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515" }}>
                <div className="flex justify-between"><p className="text-white font-bold">{formatUGX(order.amount)}</p><span className="text-[10px] px-2 py-1 rounded-full" style={{background: order.status==='pending'?'rgba(251,191,36,0.1)':'rgba(34,197,94,0.1)', color: order.status==='pending'?'#fbbf24':'#22c55e'}}>{order.status}</span></div>
                <p className="text-gray-400 text-xs mt-1">{users.find(u=>u.id===order.user_id)?.phone || order.user_id}</p>
                <p className="text-gray-500 text-[10px]">Bank: {order.bank_card?.accountNumber || JSON.stringify(order.bank_card)?.slice(0,40)}</p>
                {order.status === "pending" && <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => handleApproveWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-black" style={{background:"#c9a84c"}}>Approve</button><button onClick={() => handleRejectWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}>Reject & Refund</button></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
                  }
