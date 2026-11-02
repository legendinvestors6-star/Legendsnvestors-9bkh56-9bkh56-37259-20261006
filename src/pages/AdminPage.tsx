import { useState, useEffect } from "react";
import {
  Users, CreditCard, ArrowDownToLine, BarChart3, Search,
  LogOut, Shield, Gift, Bell
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
      try {
        // Load users
        let { data: allUsers } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (!allUsers || allUsers.length === 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
          allUsers = profiles as any;
        }
        const usersList = allUsers || [];

        // Load orders
        const { data: recharges } = await supabase.from('recharge_orders').select('*').order('created_at', { ascending: false });
        const { data: withdraws } = await supabase.from('withdraw_orders').select('*').order('created_at', { ascending: false });
        const { data: products } = await supabase.from('user_products').select('*');
        const { data: gifts } = await supabase.from('gift_codes').select('*').order('created_at', { ascending: false });
        const { data: resets } = await supabase.from('password_resets').select('*').order('created_at', { ascending: false });

        const allRecharge = recharges || [];
        const allWithdraw = withdraws || [];
        const allProducts = products || [];

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
            createdAt: u.created_at,
            isBanned: !!u.is_banned,
            totalDeposited: userRecharges.reduce((s: number, r: any) => s + Number(r.amount), 0),
            totalWithdrawn: userWithdraws.reduce((s: number, w: any) => s + Number(w.amount), 0),
            activePackages: userProds.filter((p: any) => p.status === 'active').length,
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
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, [refreshKey]);

  const pendingRecharge = rechargeOrders.filter((o: any) => o.status === "pending");
  const pendingWithdraw = withdrawOrders.filter((o: any) => o.status === "pending");
  const pendingResets = passwordResets.filter((r: any) => r.status === "pending");
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);
  const filteredUsers = users.filter(u => `${u.phone} ${u.name} ${u.referralCode}`.toLowerCase().includes(searchQ.toLowerCase()));

  // FIXED: APPROVE = CREDIT WALLET IMMEDIATELY!
  const handleApproveRecharge = async (orderId: string) => {
    const order = rechargeOrders.find(o => o.id === orderId);
    if (!order) return;

    const ok = window.confirm(`Approve ${formatUGX(order.amount)} for ${order.user_id}?\n\nWallet will be credited IMMEDIATELY!`);
    if (!ok) return;

    try {
      // 1. Get current balance
      let currentBalance = 0;
      let userFound = false;
      
      const { data: userData } = await supabase.from('users').select('balance').eq('id', order.user_id).maybeSingle();
      if (userData) {
        currentBalance = Number(userData.balance || 0);
        userFound = true;
      } else {
        // Try profiles table
        const { data: profileData } = await supabase.from('profiles').select('balance').eq('id', order.user_id).maybeSingle();
        if (profileData) {
          currentBalance = Number((profileData as any).balance || 0);
          userFound = true;
        }
      }

      if (!userFound) {
        toast.error(`User ${order.user_id} not found in DB!`);
        return;
      }

      const newBalance = currentBalance + Number(order.amount);

      // 2. Update recharge to APPROVED (not completed, so filter works!)
      const { error: statusErr } = await supabase.from('recharge_orders').update({ status: 'approved' }).eq('id', orderId);
      if (statusErr) {
        toast.error('Failed to approve: ' + statusErr.message + ' - Run SQL DISABLE RLS');
        return;
      }

      // 3. CREDIT WALLET - This is the important part!
      const { error: balErr } = await supabase.from('users').update({ balance: newBalance }).eq('id', order.user_id);
      if (balErr) {
        // Try profiles if users fails
        const { error: balErr2 } = await supabase.from('profiles').update({ balance: newBalance } as any).eq('id', order.user_id);
        if (balErr2) {
          toast.error(`Approved but wallet credit FAILED: ${balErr.message}. Run SQL: ALTER TABLE users DISABLE RLS;`);
          setRefreshKey(v => v + 1);
          return;
        }
      }

      toast.success(`✅ APPROVED! ${formatUGX(order.amount)} credited!\nOld: ${formatUGX(currentBalance)} → New: ${formatUGX(newBalance)}`);
      setRefreshKey(v => v + 1);

    } catch (e:any) {
      toast.error('Approve failed: ' + e.message);
    }
  };

  const handleRejectRecharge = async (orderId: string) => {
    await supabase.from('recharge_orders').update({ status: 'rejected' }).eq('id', orderId);
    toast.success("Rejected");
    setRefreshKey(v => v + 1);
  };

  const handleApproveWithdraw = async (orderId: string) => {
    await supabase.from('withdraw_orders').update({ status: 'approved' }).eq('id', orderId);
    toast.success("Withdrawal approved - send money manually!");
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
    else { toast.success(`Balance updated: ${formatUGX(newValue)}`); setRefreshKey(v => v + 1); }
  };

  const handleBanUser = async (user: any) => {
    await supabase.from('users').update({ is_banned: !user.isBanned }).eq('id', user.id);
    toast.success(user.isBanned ? "Unbanned" : "Banned");
    setRefreshKey(v => v + 1);
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`DELETE USER ${user.phone}? This deletes all his orders!`)) return;
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
    else { toast.success(`Gift ${newGiftCode} created`); setNewGiftCode(""); setNewGiftAmount(""); setRefreshKey(v => v + 1); }
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users, badge: users.length },
    { key: "recharge", label: "Recharge", icon: CreditCard, badge: pendingRecharge.length },
    { key: "withdraw", label: "Withdraw", icon: ArrowDownToLine, badge: pendingWithdraw.length },
    { key: "gifts", label: "Gifts", icon: Gift },
    { key: "resets", label: "Resets", icon: Bell, badge: pendingResets.length },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <div className="flex items-center justify-between p-4" style={{ background: "#111", borderBottom: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2"><Shield size={18} className="text-[#c9a84c]" /><span className="text-white font-black text-lg">LEGEND Admin</span><span className="text-[10px] text-gray-500 ml-2">Approve → Auto Credit</span></div>
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
              <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-3xl font-black text-green-400">{rechargeOrders.filter(r=>['approved','completed'].includes(r.status)).length}</p><p className="text-gray-500 text-xs">Approved Recharges</p></div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "#151515" }}><p className="text-gray-500 text-xs">Total Platform Balance</p><p className="text-[#c9a84c] text-2xl font-black">{formatUGX(totalBalance)}</p><p className="text-green-400 text-xs mt-1">Total Approved: {formatUGX(rechargeOrders.filter(r=>['approved','completed'].includes(r.status)).reduce((s,r)=>s+Number(r.amount),0))}</p></div>
            <div className="rounded-2xl p-4" style={{ background: "#1a1a1a", border: "1px solid #333" }}><p className="text-white font-bold text-xs">If orders show 0, run this SQL in Supabase:</p><p className="text-yellow-400 text-[10px] mt-2 font-mono">ALTER TABLE users DISABLE ROW LEVEL SECURITY;<br/>ALTER TABLE recharge_orders DISABLE ROW LEVEL SECURITY;<br/>ALTER TABLE withdraw_orders DISABLE ROW LEVEL SECURITY;</p></div>
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
                  <div><p className="text-white font-bold text-sm">{user.phone}</p><p className="text-gray-500 text-[11px]">{user.name} • ID: {user.id.slice(0,8)}</p></div>
                  <span className="text-[10px] font-bold text-black px-2 py-0.5 rounded-full" style={{background:"#c9a84c"}}>{user.referralCode || 'NO CODE'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl p-2.5" style={{ background: "#1e1e1e" }}><p className="text-[#c9a84c] font-bold text-sm">{formatUGX(user.balance)}</p><p className="text-gray-600 text-[10px]">Current Wallet</p></div>
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
            {rechargeOrders.length === 0 && <div className="rounded-2xl p-8 text-center" style={{ background: "#151515" }}><p className="text-gray-500 text-sm">No recharge orders found</p><p className="text-gray-600 text-xs mt-2">Check Supabase RLS - Run DISABLE RLS SQL</p></div>}
            {rechargeOrders.map((order: any) => {
              const userPhone = users.find(u=>u.id===order.user_id)?.phone || order.phone || order.user_id?.slice(0,12);
              return (
                <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515", border: order.status==='pending'?'1px solid rgba(251,191,36,0.3)':'1px solid #222' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-bold text-base">{formatUGX(order.amount)}</p>
                      <p className="text-gray-300 text-xs mt-1">User: <span className="text-[#c9a84c] font-bold">{userPhone}</span></p>
                      <p className="text-gray-500 text-[11px]">To: {order.phone_number || order.phone} • {order.payment_method?.toUpperCase()} • {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{background: order.status==='pending'?'rgba(251,191,36,0.15)': order.status==='rejected'?'rgba(239,68,68,0.15)':'rgba(34,197,94,0.15)', color: order.status==='pending'?'#fbbf24': order.status==='rejected'?'#ef4444':'#22c55e'}}>{order.status.toUpperCase()}</span>
                  </div>
                  {order.status === "pending" && <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => handleApproveRecharge(order.id)} className="py-3 rounded-xl text-xs font-black text-black" style={{background:"#22c55e"}}>✓ APPROVE + CREDIT WALLET</button><button onClick={() => handleRejectRecharge(order.id)} className="py-3 rounded-xl text-xs font-bold text-red-400" style={{ background: "rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)" }}>✕ Reject</button></div>}
                  {order.status === 'approved' && <p className="text-green-400 text-[11px] mt-2 font-bold">✓ Wallet credited - User can buy products</p>}
                </div>
              );
            })}
          </div>
        )}

        {tab === "withdraw" && (
          <div className="space-y-3">
            {withdrawOrders.length === 0 && <p className="text-gray-500 text-sm text-center mt-8">No withdraw orders</p>}
            {withdrawOrders.map((order: any) => (
              <div key={order.id} className="rounded-2xl p-4" style={{ background: "#151515" }}>
                <div className="flex justify-between"><p className="text-white font-bold">{formatUGX(order.amount)}</p><span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{background: order.status==='pending'?'rgba(251,191,36,0.1)':'rgba(34,197,94,0.1)', color: order.status==='pending'?'#fbbf24':'#22c55e'}}>{order.status.toUpperCase()}</span></div>
                <p className="text-gray-400 text-xs mt-1">{users.find(u=>u.id===order.user_id)?.phone || order.user_id}</p>
                {order.status === "pending" && <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => handleApproveWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-black" style={{background:"#c9a84c"}}>Approve Withdraw</button><button onClick={() => handleRejectWithdraw(order.id)} className="py-2.5 rounded-xl text-xs font-bold text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}>Reject & Refund</button></div>}
              </div>
            ))}
          </div>
        )}

        {tab === "gifts" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{background:"#151515"}}>
              <p className="text-white font-bold text-sm mb-3">Create Gift Code</p>
              <div className="flex gap-2">
                <input value={newGiftCode} onChange={e=>setNewGiftCode(e.target.value)} placeholder="CODE e.g. LEGEND100" className="flex-1 rounded-xl px-3 py-2.5 text-sm bg-[#1e1e1e] border border-[#333] text-white" />
                <input value={newGiftAmount} onChange={e=>setNewGiftAmount(e.target.value)} placeholder="Amount" type="number" className="w-24 rounded-xl px-3 py-2.5 text-sm bg-[#1e1e1e] border border-[#333] text-white" />
                <button onClick={handleCreateGift} className="px-4 py-2.5 rounded-xl text-xs font-bold text-black" style={{background:"#c9a84c"}}>Create</button>
              </div>
            </div>
            <div className="space-y-2">
              {giftCodes.map((g:any)=><div key={g.id} className="rounded-xl p-3 flex justify-between" style={{background:"#151515"}}><div><p className="text-white font-bold text-sm">{g.code} - {formatUGX(g.amount)}</p><p className="text-gray-500 text-[11px]">{g.is_used?'Used':'Unused'} • {new Date(g.created_at).toLocaleDateString()}</p></div><span className={`text-[10px] px-2 py-1 rounded-full ${g.is_used?'bg-red-500/20 text-red-400':'bg-green-500/20 text-green-400'}`}>{g.is_used?'USED':'ACTIVE'}</span></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
     }
