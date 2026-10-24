import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Users } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const formatUGX = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function TeamPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [level1, setLevel1] = useState<any[]>([]);
  const [level2, setLevel2] = useState<any[]>([]);
  const [level3, setLevel3] = useState<any[]>([]);
  const [commissions, setCommissions] = useState({ level1: 0, level2: 0, level3: 0 });
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let userId: string | null = null;
      let userObj: any = null;
      const phone = localStorage.getItem('phone');

      // 1. Try Supabase Auth first
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) userObj = data;
        else {
          const { data: u } = await supabase.from('users').select('*').eq('id', user.id).single();
          userObj = u;
        }
      } 
      // 2. FALLBACK: Your custom phone login - WORKS ON ALL DEVICES
      else if (phone) {
        // Try users table first (your real table), then profiles
        let { data: u } = await supabase.from('users').select('*').eq('phone', phone).single();
        if (!u) {
          const { data: p } = await supabase.from('profiles').select('*').eq('phone', phone).single();
          u = p as any;
        }
        if (!u) {
          navigate('/login');
          return;
        }
        userObj = u;
        userId = u.id;
      } else {
        navigate('/login');
        return;
      }

      setCurrentUser(userObj);
      if (!userId) { setLoading(false); return; }

      // Helper to query from both tables
      const getReferrals = async (ids: string[]) => {
        if (ids.length === 0) return [];
        let { data } = await supabase.from('profiles').select('id, phone, created_at, balance, referral_code').in('referred_by', ids);
        if (!data || data.length === 0) {
          const { data: usersData } = await supabase.from('users').select('id, phone, created_at, balance, referral_code').in('referred_by', ids);
          // Also try referrer_id if your column is different
          if (!usersData || usersData.length === 0) {
            const { data: usersData2 } = await supabase.from('users').select('id, phone, created_at, balance, referral_code').in('referrer_id', ids);
            return usersData2 || [];
          }
          return usersData || [];
        }
        return data;
      };

      // Level 1
      let l1Data = await getReferrals([userId]);
      // Fallback: some projects store referral_code not id
      if (l1Data.length === 0 && userObj?.referral_code) {
        const { data: l1ByCode } = await supabase.from('users').select('id, phone, created_at, balance, referral_code').eq('referred_by_code', userObj.referral_code);
        if (l1ByCode && l1ByCode.length > 0) l1Data = l1ByCode;
      }
      setLevel1(l1Data);

      // Level 2
      let l2Data: any[] = [];
      if (l1Data.length > 0) {
        const l1Ids = l1Data.map((u: any) => u.id);
        l2Data = await getReferrals(l1Ids);
        setLevel2(l2Data);
      }

      // Level 3
      let l3Data: any[] = [];
      if (l2Data.length > 0) {
        const l2Ids = l2Data.map((u: any) => u.id);
        l3Data = await getReferrals(l2Ids);
        setLevel3(l3Data);
      }

      // Team Deposit
      const allTeamIds = [...l1Data, ...l2Data, ...l3Data].map((u: any) => u.id);
      if (allTeamIds.length > 0) {
        const { data: deposits } = await supabase.from('recharge_orders').select('amount').in('user_id', allTeamIds).eq('status', 'completed');
        if (deposits) setTotalDeposit(deposits.reduce((s, c) => s + Number(c.amount), 0));
      }

      // Commissions
      const { data: comms } = await supabase.from('commissions').select('level, amount').eq('user_id', userId);
      if (comms) {
        setCommissions({
          level1: comms.filter(c => c.level === 1).reduce((s, c) => s + Number(c.amount), 0),
          level2: comms.filter(c => c.level === 2).reduce((s, c) => s + Number(c.amount), 0),
          level3: comms.filter(c => c.level === 3).reduce((s, c) => s + Number(c.amount), 0),
        });
      }

      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div className="bg-black min-h-screen flex items-center justify-center text-white">Loading team...</div>;
  if (!currentUser) return null;

  const totalTeam = level1.length + level2.length + level3.length;
  const referralUrl = `${window.location.origin}/#/register?ref=${currentUser.referral_code}`;

  const copy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const levels = [
    { level: 1, members: level1, rate: '27%', commission: commissions.level1 },
    { level: 2, members: level2, rate: '2%', commission: commissions.level2 },
    { level: 3, members: level3, rate: '1%', commission: commissions.level3 },
  ];

  return (
    <AppLayout>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-white text-xl font-black flex items-center gap-2">
          <span className="w-1 h-6 rounded-full inline-block" style={{background:'linear-gradient(135deg,#c9a84c,#f0c040)'}} /> Team
        </h1>
      </div>

      <div className="mx-4 mb-3 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #1a1400, #2a2000)', border: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-[#c9a84c]" />
          <span className="text-[#c9a84c] font-semibold text-sm">Total Team</span>
          <span className="text-white font-black text-2xl ml-auto">{totalTeam}</span>
        </div>
        <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid rgba(201,168,76,0.2)' }}>
          <div><p className="text-3xl font-black text-[#c9a84c]">{formatUGX(totalDeposit)}</p><p className="text-gray-500 text-xs">Team Deposit</p></div>
          <div className="text-right"><p className="text-xl font-black text-[#c9a84c]">{formatUGX(commissions.level1 + commissions.level2 + commissions.level3)}</p><p className="text-gray-500 text-xs">Total Commission</p></div>
        </div>
      </div>

      <div className="mx-4 mb-3 rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        <p className="text-gray-400 text-sm mb-2">Share URL</p>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 rounded-xl px-3 py-2.5 text-xs text-gray-400 truncate" style={{ background: '#1e1e1e', border: '1px solid #333' }}>{referralUrl}</div>
          <button onClick={copy} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#2a2a2a' }}>{copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}</button>
        </div>
        <button onClick={copy} className="w-full py-3.5 rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#c9a84c,#f0c040)'}}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied!' : 'Copy Link'}</button>
      </div>

      <div className="px-4 space-y-2 mb-4">
        {levels.map((lvl, i) => (
          <div key={lvl.level} className="rounded-2xl p-4" style={{ background: i === 0 ? 'linear-gradient(135deg, #1a1400, #2a2000)' : '#151515', border: i === 0 ? '1px solid rgba(201,168,76,0.4)' : '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between">
              <div><p className="font-black text-white text-base">Level {lvl.level}</p><p className="text-gray-500 text-xs">{lvl.members.length} Members</p></div>
              <div className="flex items-center gap-4">
                <div className="text-right"><p className="text- text-gray-500">Rate</p><p className="text-[#c9a84c] font-black text-2xl">{lvl.rate}</p></div>
                <div style={{ width: 1, height: 40, background: 'rgba(201,168,76,0.2)' }} />
                <div className="text-right"><p className="text- text-gray-500">Commission</p><p className="text-white font-bold text-sm">{formatUGX(lvl.commission)}</p></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalTeam === 0 ? (
        <div className="mx-4 rounded-2xl p-10 text-center" style={{ background: '#151515' }}><Users size={32} className="text-gray-600 mx-auto mb-2" /><p className="text-gray-600 text-sm">No Members yet</p></div>
      ) : (
        <div className="px-4 space-y-4">
          {levels.map(lvl => lvl.members.length > 0 && (
            <div key={lvl.level} className="space-y-2">
              <h3 className="text-white font-semibold text-sm">Level {lvl.level} Members ({lvl.members.length})</h3>
              {lvl.members.map((member: any) => (
                <div key={member.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
                  <div><p className="text-white text-sm">{member.phone}</p><p className="text-gray-500 text-xs">{new Date(member.created_at).toLocaleDateString()}</p></div>
                  <span className="text-[#c9a84c] text-xs">Lv{lvl.level} • {formatUGX(member.balance||0)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="h-6" />
    </AppLayout>
  );
}