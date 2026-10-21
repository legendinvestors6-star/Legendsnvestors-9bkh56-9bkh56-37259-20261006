import { useState, useEffect } from "react"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)

type Tab = 'overview' | 'users' | 'recharges' | 'withdraws'

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<any[]>([])
  const [recharges, setRecharges] = useState<any[]>([])
  const [withdraws, setWithdraws] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null)
  const [userHistory, setUserHistory] = useState<any>({ recharges: [], withdraws: [], transactions: [] })
  const [adjustUser, setAdjustUser] = useState<any>(null)
  const [amount, setAmount] = useState("")

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [u, r, w] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('recharges').select('*').order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('*').order('created_at', { ascending: false }),
    ])
    if (u.data) setUsers(u.data)
    if (r.data) setRecharges(r.data)
    if (w.data) setWithdraws(w.data)
  }

  const getReferrer = (code: string) => {
    if (!code) return null
    return users.find(x => x.referral_code === code)
  }

  const viewUserDetail = async (u: any) => {
    setSelectedUserDetail(u)
    const [r, w, t] = await Promise.all([
      supabase.from('recharges').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
    ])
    setUserHistory({ recharges: r.data || [], withdraws: w.data || [], transactions: t.data || [] })
  }

  const viewTeam = async (user: any) => {
    const { data } = await supabase.from('users').select('*').eq('referred_by', user.referral_code)
    setTeamMembers(data || [])
    setSelectedTeam(user)
  }

  const handleBan = async (id: string, isBanned: boolean) => {
    await supabase.from('users').update({ is_banned: !isBanned }).eq('id', id)
    fetchAll()
  }

  const handleAdjust = async () => {
    if (!adjustUser || !amount) return
    const num = Number(amount)
    await supabase.from('users').update({ 
      balance: (adjustUser.balance || 0) + num,
      total_earned: num > 0 ? (adjustUser.total_earned || 0) + num : adjustUser.total_earned
    }).eq('id', adjustUser.id)
    await supabase.from('transactions').insert({
      user_id: adjustUser.id,
      type: 'admin_adjust',
      amount: num,
      description: `Admin ${num > 0 ? 'added' : 'deducted'} ${Math.abs(num)} UGX`
    })
    setAdjustUser(null); setAmount(""); fetchAll()
  }

  const approveWithdraw = async (id: string) => {
    await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', id)
    fetchAll()
  }

  const filtered = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search) ||
    u.referral_code?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    totalUsers: users.length,
    totalBalance: users.reduce((s, u) => s + (u.balance || 0), 0),
    totalEarned: users.reduce((s, u) => s + (u.total_earned || 0), 0),
    pendingRecharge: recharges.filter(r => r.status === 'pending').length,
    pendingWithdraw: withdraws.filter(w => w.status === 'pending').length,
  }

  return (
    <div className="bg-[#080a12] min-h-screen p-3 pb-32 text-white">
      <div className="max-w-md mx-auto">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#1a1f2e] rounded-xl p-3 text-center border border-[#2a3248]">
            <p className="text-[18px] font-bold">{stats.totalUsers}</p><p className="text-[10px] text-gray-500">Total Users</p>
          </div>
          <div className="bg-[#1a1f2e] rounded-xl p-3 text-center border border-[#2a3248]">
            <p className="text-[12px] font-bold text-green-400">{stats.totalBalance.toLocaleString()}</p><p className="text-[10px] text-gray-500">Total Balance UGX</p>
          </div>
          <div className="bg-[#1a1f2e] rounded-xl p-3 text-center border border-[#2a3248]">
            <p className="text-[18px] font-bold text-orange-400">{stats.pendingWithdraw + stats.pendingRecharge}</p><p className="text-[10px] text-gray-500">Pending</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          {(['users','recharges','withdraws','overview'] as Tab[]).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2 rounded-full text-[12px] font-bold capitalize ${tab===t ? 'bg-[#f8e7a0] text-black' : 'bg-[#1a1f2e] text-gray-400'}`}>{t}</button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-[#1e2330] rounded-[14px] flex items-center px-4 py-2.5 border border-[#2a2f45] mb-3">
          <span className="mr-2">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, referral code..." className="flex-1 bg-transparent outline-none text-[13px] placeholder-gray-500" />
        </div>

        {/* USERS TAB */}
        {tab === 'users' && (
          <div className="space-y-3">
            {filtered.map(u => {
              const referrer = getReferrer(u.referred_by)
              return (
                <div key={u.id} className="bg-[#1a1f2e] border border-[#2a3248] rounded-[18px] p-4">
                  <div className="flex justify-between">
                    <div className="cursor-pointer" onClick={()=>viewUserDetail(u)}>
                      <h2 className="font-bold text-[16px]">{u.name} {u.is_banned && <span className="text-red-500 text-xs">[BANNED]</span>}</h2>
                      <p className="text-[13px] text-gray-400">{u.phone}</p>
                      <p className="text-[11px] text-gray-500">Joined: {new Date(u.created_at).toLocaleDateString()} • {new Date(u.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[16px] text-[#4ade80]">{(u.balance || 0).toLocaleString()} UGX</p>
                      <p className="text-[11px] text-gray-500">Remaining</p>
                      <p className="text-[11px] text-blue-400 mt-1 cursor-pointer" onClick={()=>viewUserDetail(u)}>View Full →</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="bg-[#232a3d] rounded-[10px] p-2 text-center"><p className="font-bold text-[#60a5fa] text-[11px]">{(u.total_earned||0).toLocaleString()}</p><p className="text-[9px] text-gray-500">Earned</p></div>
                    <div className="bg-[#232a3d] rounded-[10px] p-2 text-center"><p className="font-bold text-[#fb923c] text-[11px]">{(u.total_withdrawn||0).toLocaleString()}</p><p className="text-[9px] text-gray-500">Withdrawn</p></div>
                    <div className="bg-[#232a3d] rounded-[10px] p-2 text-center"><p className="font-bold text-[#4ade80] text-[14px]">{u.active_packages||0}</p><p className="text-[9px] text-gray-500">Pkgs</p></div>
                    <div className="bg-[#232a3d] rounded-[10px] p-2 text-center"><p className="font-bold text-[#c084fc] text-[14px]">{u.referral_count||0}</p><p className="text-[9px] text-gray-500">Referrals</p></div>
                  </div>

                  <div className="bg-[#0e1320] rounded-lg p-2.5 mt-2.5 border border-[#1f2937]">
                    <p className="text-[10px] text-gray-500">REFERRED BY:</p>
                    <p className="text-[12px] text-[#f8e7a0] font-bold">{referrer ? `${referrer.name} - ${referrer.phone} (${referrer.referral_code})` : u.referred_by ? `Code: ${u.referred_by} (Not found)` : 'Direct - No Referrer'}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-500">His Code: <span className="text-blue-400">{u.referral_code}</span></span>
                      <span className="text-[10px] text-gray-500">Used Code: <span className="text-orange-300">{u.referred_by || 'None'}</span></span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button onClick={()=>viewTeam(u)} className="flex-1 bg-[#25304a] text-[#60a5fa] py-2 rounded-full text-[12px] font-semibold">👥 Team ({u.referral_count||0})</button>
                    <button onClick={() => setAdjustUser(u)} className="flex-1 bg-[#3a341f] text-[#facc15] py-2 rounded-full text-[12px] font-semibold">Adjust</button>
                    <button onClick={() => handleBan(u.id, u.is_banned)} className={`flex-1 py-2 rounded-full text-[12px] font-semibold ${u.is_banned ? 'bg-green-900 text-green-300' : 'bg-[#3a1f2a] text-[#f87171]'}`}>{u.is_banned ? 'Unban' : 'Ban'}</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* RECHARGES TAB */}
        {tab === 'recharges' && (
          <div className="space-y-2">
            {recharges.filter(r => search ? r.phone?.includes(search) || r.reference?.includes(search) : true).map(r => (
              <div key={r.id} className="bg-[#1a1f2e] rounded-xl p-3 flex justify-between border border-[#2a3248]">
                <div><p className="font-bold text-sm">{r.amount?.toLocaleString()} UGX</p><p className="text-xs text-gray-400">{r.phone} • {r.provider}</p><p className="text-[10px] text-gray-500">{r.reference} • {new Date(r.created_at).toLocaleDateString()}</p></div>
                <div className="text-right"><p className={`text-xs font-bold px-2 py-1 rounded-full ${r.status==='completed'?'bg-green-900 text-green-300': r.status==='pending'?'bg-yellow-900 text-yellow-300':'bg-red-900 text-red-300'}`}>{r.status}</p><p className="text-[10px] text-gray-500 mt-1">{r.user_id?.slice(0,8)}</p></div>
              </div>
            ))}
          </div>
        )}

        {/* WITHDRAWS TAB */}
        {tab === 'withdraws' && (
          <div className="space-y-2">
            {withdraws.map(w => (
              <div key={w.id} className="bg-[#1a1f2e] rounded-xl p-3 flex justify-between border border-[#2a3248]">
                <div><p className="font-bold text-sm">{w.amount?.toLocaleString()} UGX</p><p className="text-xs text-gray-400">{w.phone}</p><p className="text-[10px] text-gray-500">{new Date(w.created_at).toLocaleString()}</p></div>
                <div className="text-right">
                  <p className={`text-xs font-bold px-2 py-1 rounded-full ${w.status==='completed'?'bg-green-900 text-green-300':'bg-yellow-900 text-yellow-300'}`}>{w.status}</p>
                  {w.status==='pending' && <button onClick={()=>approveWithdraw(w.id)} className="mt-2 bg-green-600 text-white text-[11px] px-3 py-1 rounded-full">Approve</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* USER FULL DETAIL MODAL */}
      {selectedUserDetail && (
        <div className="fixed inset-0 bg-black/90 flex items-start justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-[#1a1f2e] rounded-[20px] p-4 w-full max-w-md mt-6 border border-[#2a3248]">
            <div className="flex justify-between"><h3 className="font-bold text-lg">{selectedUserDetail.name}</h3><button onClick={()=>setSelectedUserDetail(null)} className="text-gray-400">✕</button></div>
            <p className="text-sm text-gray-400">{selectedUserDetail.phone} • {selectedUserDetail.referral_code}</p>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-[#232a3d] p-3 rounded-xl"><p className="text-xs text-gray-500">Remaining Balance</p><p className="font-bold text-green-400">{selectedUserDetail.balance?.toLocaleString()} UGX</p></div>
              <div className="bg-[#232a3d] p-3 rounded-xl"><p className="text-xs text-gray-500">Total Earned</p><p className="font-bold text-blue-400">{selectedUserDetail.total_earned?.toLocaleString()} UGX</p></div>
              <div className="bg-[#232a3d] p-3 rounded-xl"><p className="text-xs text-gray-500">Total Withdrawn</p><p className="font-bold text-orange-400">{selectedUserDetail.total_withdrawn?.toLocaleString()} UGX</p></div>
              <div className="bg-[#232a3d] p-3 rounded-xl"><p className="text-xs text-gray-500">Referrals</p><p className="font-bold text-purple-400">{selectedUserDetail.referral_count || 0}</p></div>
            </div>

            <div className="mt-4">
              <h4 className="font-bold text-sm mb-2">Recharge History ({userHistory.recharges.length})</h4>
              {userHistory.recharges.map((r:any)=><div key={r.id} className="flex justify-between text-xs py-1.5 border-b border-gray-800"><span>{r.amount} UGX - {r.provider}</span><span className={r.status==='completed'?'text-green-400':'text-yellow-400'}>{r.status}</span></div>)}
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm mb-2">Withdraw History ({userHistory.withdraws.length})</h4>
              {userHistory.withdraws.map((w:any)=><div key={w.id} className="flex justify-between text-xs py-1.5 border-b border-gray-800"><span>{w.amount} UGX</span><span className={w.status==='completed'?'text-green-400':'text-yellow-400'}>{w.status}</span></div>)}
            </div>

            <button onClick={()=>setSelectedUserDetail(null)} className="w-full mt-6 py-3 bg-[#f8e7a0] text-black rounded-xl font-bold">Close</button>
          </div>
        </div>
      )}

      {/* Team Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1f2e] rounded-[20px] p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto border border-[#2a3248]">
            <h3 className="font-bold">{selectedTeam.name}'s Team ({teamMembers.length})</h3>
            {teamMembers.map((m:any)=><div key={m.id} className="bg-[#232a3d] rounded-xl p-3 mb-2 flex justify-between"><div><p className="font-bold text-sm">{m.name}</p><p className="text-xs text-gray-400">{m.phone}</p></div><p className="text-sm text-green-400">{m.balance} UGX</p></div>)}
            <button onClick={()=>setSelectedTeam(null)} className="w-full mt-4 py-3 bg-[#f8e7a0] text-black rounded-xl font-bold">Close</button>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1f2e] rounded-[20px] p-5 w-full max-w-sm border border-[#2a3248]">
            <h3 className="font-bold">Adjust {adjustUser.name}</h3>
            <p className="text-xs text-gray-500 mb-3">Current Balance: {adjustUser.balance} UGX</p>
            <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="5000 to add, -5000 to deduct" className="w-full bg-[#0a0a0a] border border-[#2a3248] rounded-xl p-3 outline-none" />
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setAdjustUser(null)} className="flex-1 py-3 bg-[#232a3d] rounded-xl">Cancel</button>
              <button onClick={handleAdjust} className="flex-1 py-3 bg-[#f8e7a0] text-black rounded-xl font-bold">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}