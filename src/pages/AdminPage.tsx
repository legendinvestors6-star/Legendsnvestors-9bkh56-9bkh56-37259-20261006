import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const formatUGX = (n: number) => `UGX ${Number(n||0).toLocaleString()}`;

export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const [recharges, setRecharges] = useState<any[]>([]);
  const [withdraws, setWithdraws] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);

  const load = async () => {
    const { data: r } = await supabase.from('recharge_orders').select('*').order('created_at', {ascending:false});
    const { data: w } = await supabase.from('withdraw_orders').select('*').order('created_at', {ascending:false});
    const { data: u } = await supabase.from('users').select('*').order('created_at', {ascending:false});
    const { data: g } = await supabase.from('gift_codes').select('*').order('created_at', {ascending:false});
    setRecharges(r||[]); setWithdraws(w||[]); setUsers(u||[]); setGifts(g||[]);
  };
  useEffect(()=>{ load(); }, [refresh]);

  const approveRecharge = async (order:any) => {
    if(!confirm(`Approve ${formatUGX(order.amount)}? Wallet will be credited!`)) return;
    try {
      const { data: ud } = await supabase.from('users').select('balance').eq('id', order.user_id).maybeSingle();
      const oldBal = Number(ud?.balance || 0);
      const newBal = oldBal + Number(order.amount);
      const { error: sErr } = await supabase.from('recharge_orders').update({status:'approved'}).eq('id', order.id);
      if(sErr){ toast.error(sErr.message); return; }
      const { error: bErr } = await supabase.from('users').update({balance:newBal}).eq('id', order.user_id);
      if(bErr){ toast.error('Approved but credit failed: '+bErr.message+' RUN SQL DISABLE RLS'); }
      else{ toast.success(`APPROVED! ${formatUGX(oldBal)} -> ${formatUGX(newBal)}`); }
      setRefresh(v=>v+1);
    } catch(e:any){ toast.error(e.message); }
  };

  const rejectRecharge = async (id:string) => {
    await supabase.from('recharge_orders').update({status:'rejected'}).eq('id', id);
    toast.success('Rejected'); setRefresh(v=>v+1);
  };

  const approveWithdraw = async (id:string) => {
    await supabase.from('withdraw_orders').update({status:'approved'}).eq('id', id);
    toast.success('Withdrawal approved'); setRefresh(v=>v+1);
  };

  const rejectWithdraw = async (order:any) => {
    const { data: ud } = await supabase.from('users').select('balance').eq('id', order.user_id).maybeSingle();
    if(ud) await supabase.from('users').update({balance: Number(ud.balance)+Number(order.amount)}).eq('id', order.user_id);
    await supabase.from('withdraw_orders').update({status:'rejected'}).eq('id', order.id);
    toast.success('Rejected & refunded'); setRefresh(v=>v+1);
  };

  const adjustBal = async (user:any) => {
    const v = prompt(`Current: ${formatUGX(user.balance)}\nEnter NEW balance for ${user.phone}:`, String(user.balance));
    if(v===null) return;
    const n = Number(v); if(isNaN(n)){ toast.error('Invalid'); return; }
    const { error } = await supabase.from('users').update({balance:n}).eq('id', user.id);
    if(error) toast.error(error.message); else { toast.success('Updated'); setRefresh(x=>x+1); }
  };

  const pendingR = recharges.filter(x=>x.status==='pending');
  const pendingW = withdraws.filter(x=>x.status==='pending');
  const totalBal = users.reduce((s,u)=>s+Number(u.balance||0),0);
  const filteredUsers = users.filter(u=> `${u.phone} ${u.name||''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{background:'#0a0a0a', minHeight:'100vh'}}>
      <div style={{background:'#111', padding:'16px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between'}}>
        <h1 style={{color:'#c9a84c', fontWeight:900}}>LEGEND Admin Panel</h1>
        <button onClick={()=>{localStorage.clear(); location.href='/login';}} style={{background:'#222', color:'#aaa', padding:'4px 12px', borderRadius:'8px', fontSize:'12px'}}>Logout</button>
      </div>

      <div style={{display:'flex', gap:'0', overflowX:'auto', background:'#111', borderBottom:'1px solid #1a1a1a'}}>
        {[
          {k:'overview', l:`Overview`},
          {k:'users', l:`Users (${users.length})`},
          {k:'recharge', l:`Recharge (${pendingR.length})`},
          {k:'withdraw', l:`Withdraw (${pendingW.length})`},
          {k:'gifts', l:`Gifts`},
        ].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'12px 16px', fontSize:'12px', fontWeight:700, whiteSpace:'nowrap', color: tab===t.k?'#c9a84c':'#666', borderBottom: tab===t.k?'2px solid #c9a84c':'none'}}>{t.l}</button>
        ))}
      </div>

      <div style={{padding:'16px', paddingBottom:'40px'}}>
        {tab==='overview' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <div style={{background:'#151515', padding:'16px', borderRadius:'16px'}}><p style={{color:'#c9a84c', fontSize:'24px', fontWeight:900}}>{users.length}</p><p style={{color:'#666', fontSize:'12px'}}>Total Users</p></div>
            <div style={{background:'#151515', padding:'16px', borderRadius:'16px'}}><p style={{color:'#fbbf24', fontSize:'24px', fontWeight:900}}>{pendingR.length}</p><p style={{color:'#666', fontSize:'12px'}}>Pending Recharge</p></div>
            <div style={{background:'#151515', padding:'16px', borderRadius:'16px'}}><p style={{color:'#ef4444', fontSize:'24px', fontWeight:900}}>{pendingW.length}</p><p style={{color:'#666', fontSize:'12px'}}>Pending Withdraw</p></div>
            <div style={{background:'#151515', padding:'16px', borderRadius:'16px'}}><p style={{color:'#22c55e', fontSize:'24px', fontWeight:900}}>{recharges.filter(x=>x.status==='approved').length}</p><p style={{color:'#666', fontSize:'12px'}}>Approved</p></div>
            <div style={{background:'#151515', padding:'16px', borderRadius:'16px', gridColumn:'1 / span 2'}}><p style={{color:'#666', fontSize:'12px'}}>Total Platform Balance</p><p style={{color:'#c9a84c', fontSize:'20px', fontWeight:900}}>{formatUGX(totalBal)}</p><p style={{color:'#22c55e', fontSize:'12px', marginTop:'4px'}}>Total Deposited: {formatUGX(recharges.filter(x=>x.status==='approved').reduce((s,r)=>s+Number(r.amount),0))}</p></div>
            <div style={{background:'#1a1a1a', padding:'12px', borderRadius:'12px', gridColumn:'1 / span 2', border:'1px solid #333'}}><p style={{color:'white', fontSize:'11px', fontWeight:'bold'}}>If you see 0 orders, run SQL:</p><p style={{color:'#fbbf24', fontSize:'10px', marginTop:'4px'}}>ALTER TABLE users DISABLE ROW LEVEL SECURITY;<br/>ALTER TABLE recharge_orders DISABLE ROW LEVEL SECURITY;<br/>ALTER TABLE withdraw_orders DISABLE ROW LEVEL SECURITY;</p></div>
          </div>
        )}

        {tab==='users' && (
          <div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search phone..." style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', color:'white', padding:'10px 14px', borderRadius:'12px', fontSize:'13px', marginBottom:'12px'}}/>
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {filteredUsers.map(u=>(
                <div key={u.id} style={{background:'#151515', border:'1px solid #222', borderRadius:'16px', padding:'14px'}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}><p style={{color:'white', fontWeight:700, fontSize:'13px'}}>{u.phone}</p><p style={{color:'#c9a84c', fontSize:'12px', fontWeight:700}}>{formatUGX(u.balance)}</p></div>
                  <p style={{color:'#666', fontSize:'11px', marginTop:'2px'}}>{u.name||'No name'} • {new Date(u.created_at).toLocaleDateString()} • {u.referral_code||'No code'}</p>
                  <button onClick={()=>adjustBal(u)} style={{marginTop:'10px', width:'100%', background:'#c9a84c', color:'black', padding:'10px', borderRadius:'10px', fontSize:'12px', fontWeight:900}}>Adjust Balance</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='recharge' && (
          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
            {recharges.length===0 && <p style={{color:'#666', textAlign:'center', marginTop:'40px'}}>No recharge orders found - Check RLS!</p>}
            {recharges.map(order=>(
              <div key={order.id} style={{background:'#151515', border: order.status==='pending'?'1px solid #fbbf2440':'1px solid #222', borderRadius:'16px', padding:'14px'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}><p style={{color:'white', fontWeight:700}}>{formatUGX(order.amount)}</p><span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'10px', fontWeight:700, background: order.status==='pending'?'#fbbf2420':'#22c55e20', color: order.status==='pending'?'#fbbf24':'#22c55e'}}>{order.status.toUpperCase()}</span></div>
                <p style={{color:'#aaa', fontSize:'12px', marginTop:'4px'}}>User: {users.find(x=>x.id===order.user_id)?.phone || order.user_id?.slice(0,12)}</p>
                <p style={{color:'#666', fontSize:'11px'}}>To: {order.phone_number || order.phone} • {order.payment_method?.toUpperCase()} • {new Date(order.created_at).toLocaleString()}</p>
                {order.status==='pending' && <div style={{display:'flex', gap:'8px', marginTop:'12px'}}><button onClick={()=>approveRecharge(order)} style={{flex:1, background:'#22c55e', color:'black', padding:'12px', borderRadius:'12px', fontWeight:900, fontSize:'12px'}}>✓ APPROVE + CREDIT WALLET</button><button onClick={()=>rejectRecharge(order.id)} style={{background:'#ef444430', color:'#ef4444', padding:'12px 16px', borderRadius:'12px', fontSize:'12px'}}>Reject</button></div>}
                {order.status==='approved' && <p style={{color:'#22c55e', fontSize:'11px', marginTop:'8px', fontWeight:700}}>✓ Wallet credited - User can buy products</p>}
              </div>
            ))}
          </div>
        )}

        {tab==='withdraw' && (
          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
            {withdraws.length===0 && <p style={{color:'#666', textAlign:'center', marginTop:'40px'}}>No withdraw orders</p>}
            {withdraws.map(order=>(
              <div key={order.id} style={{background:'#151515', border:'1px solid #222', borderRadius:'16px', padding:'14px'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}><p style={{color:'white', fontWeight:700}}>{formatUGX(order.amount)}</p><span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background: order.status==='pending'?'#fbbf2420':'#22c55e20', color: order.status==='pending'?'#fbbf24':'#22c55e'}}>{order.status.toUpperCase()}</span></div>
                <p style={{color:'#aaa', fontSize:'12px', marginTop:'4px'}}>{users.find(x=>x.id===order.user_id)?.phone || order.user_id}</p>
                {order.status==='pending' && <div style={{display:'flex', gap:'8px', marginTop:'12px'}}><button onClick={()=>approveWithdraw(order.id)} style={{flex:1, background:'#c9a84c', color:'black', padding:'10px', borderRadius:'10px', fontWeight:700, fontSize:'12px'}}>Approve Withdraw</button><button onClick={()=>rejectWithdraw(order)} style={{background:'#ef444430', color:'#ef4444', padding:'10px 16px', borderRadius:'10px', fontSize:'12px'}}>Reject & Refund</button></div>}
              </div>
            ))}
          </div>
        )}

        {tab==='gifts' && (
          <div style={{background:'#151515', padding:'16px', borderRadius:'16px'}}>
            <p style={{color:'white', fontWeight:700, fontSize:'14px'}}>Gift Codes</p>
            <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
              <input id="giftCode" placeholder="CODE e.g. LEGEND100" style={{flex:1, background:'#1e1e1e', border:'1px solid #333', color:'white', padding:'10px', borderRadius:'10px', fontSize:'12px'}}/>
              <input id="giftAmt" placeholder="Amount" type="number" style={{width:'90px', background:'#1e1e1e', border:'1px solid #333', color:'white', padding:'10px', borderRadius:'10px', fontSize:'12px'}}/>
              <button onClick={async()=>{ const code=(document.getElementById('giftCode') as any).value; const amt=(document.getElementById('giftAmt') as any).value; if(!code||!amt){ toast.error('Fill code & amount'); return; } const {error}=await supabase.from('gift_codes').insert({code:code.toUpperCase(), amount:Number(amt), is_used:false, created_at:new Date().toISOString()}); if(error) toast.error(error.message); else { toast.success('Gift created'); setRefresh(v=>v+1); (document.getElementById('giftCode') as any).value=''; (document.getElementById('giftAmt') as any).value=''; } }} style={{background:'#c9a84c', color:'black', padding:'10px 16px', borderRadius:'10px', fontWeight:700, fontSize:'12px'}}>Create</button>
            </div>
            <div style={{marginTop:'16px', display:'flex', flexDirection:'column', gap:'8px'}}>
              {gifts.map((g:any)=><div key={g.id} style={{background:'#1e1e1e', padding:'10px 12px', borderRadius:'10px', display:'flex', justifyContent:'space-between'}}><p style={{color:'white', fontSize:'13px'}}>{g.code} - {formatUGX(g.amount)}</p><p style={{color: g.is_used?'#ef4444':'#22c55e', fontSize:'11px'}}>{g.is_used?'USED':'ACTIVE'}</p></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
      }
