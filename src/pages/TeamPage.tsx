import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Users, Share2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const formatUGX = (n: number) => `UGX ${Number(n||0).toLocaleString()}`;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile) { navigate('/login'); return; }
      setCurrentUser(profile);

      // Level 1
      const { data: l1 } = await supabase.from('profiles').select('id, phone, created_at, balance').eq('referred_by', user.id);
      const l1Data = l1 || [];
      setLevel1(l1Data);

      // Level 2
      let l2Data: any[] = [];
      if (l1Data.length > 0) {
        const l1Ids = l1Data.map((u: any) => u.id);
        const { data: l2 } = await supabase.from('profiles').select('id, phone, created_at, balance').in('referred_by', l1Ids);
        l2Data = l2 || [];
        setLevel2(l2Data);
      }

      // Level 3
      let l3Data: any[] = [];
      if (l2Data.length > 0) {
        const l2Ids = l2Data.map((u: any) => u.id);
        const { data: l3 } = await supabase.from('profiles').select('id, phone, created_at, balance').in('referred_by', l2Ids);
        l3Data = l3 || [];
        setLevel3(l3Data);
      }

      // Total team deposit (from recharge_orders where status=completed)
      const allTeamIds = [...l1Data, ...l2Data, ...l3Data].map((u:any) => u.id);
      if (allTeamIds.length > 0) {
        const { data: deposits } = await supabase.from('recharge_orders').select('amount').in('user_id', allTeamIds).eq('status', 'completed');
        if (deposits) {
          setTotalDeposit(deposits.reduce((s,c) => s + Number(c.amount), 0));
        }
      }

      // Commissions - safe if table doesn't exist
      try {
        const { data: comms } = await supabase.from('commissions').select('level, amount').eq('user_id', user.id);
        if (comms) {
          setCommissions({
            level1: comms.filter(c => c.level === 1).reduce((s, c) => s + Number(c.amount), 0),
            level2: comms.filter(c => c.level === 2).reduce((s, c) => s + Number(c.amount), 0),
            level3: comms.filter(c => c.level === 3).reduce((s, c) => s + Number(c.amount), 0),
          });
        }
      } catch (e) {
        // commissions table may not exist yet - ignore
        console.log('commissions table not found, using 0');
      }

      setLoading(false);
    })();
  }, [navigate]);

  if (loading || !currentUser) return <div className="bg-black min-h-screen flex items-center justify-center text-white">Loading team...</div>;

  const totalTeam = level1.length + level2.length + level3.length;
  // Fix referral URL for both HashRouter and BrowserRouter
  const referralUrl = `${window.location.origin}/register?ref=${currentUser.referral_code || currentUser.referralCode}`;

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
          <span className="w-1 h-6 rounded-full inline-block" style={{background:'linear-gradient(135deg,#c9a84c,#f0c040)'}} />
          Team
        </h1>
      </div>

      <div className="mx-4 mb-3 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #1a1400, #2a2000)', border: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-[#c9a84c]" />
          <span className="text-[#c9a84c] font-semibold text-sm">Total Team</span>
          <span className="text-white font-black text-2xl ml-auto">{totalTeam}</span>
        </div>
        <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid rgba(201,168,76,0.2)' }}>
          <div>
            <p className="text-3xl font-black text-[#c9a84c]">{formatUGX(totalDeposit)}</p>
            <p className="text-gray-500 text-xs mt-0.5">Team Deposit</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-[#c9a84c]">{formatUGX(commissions.level1 + commissions.level2 + commissions.level3)}</p>
            <p className="text-gray-500 text-xs mt-0.5">Total Commission</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        <p className="text-gray-400 text-sm mb-2 font-medium">Share URL</p>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 rounded-xl px-3 py-2.5 text-xs text-gray-400 truncate" style={{ background: '#1e1e1e', border: '1px solid #333' }}>
            {referralUrl}
          </div>
          <button onClick={copy} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#2a2a2a' }}>
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={copy} className="py-3.5 rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#c9a84c,#f0c040)'}}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button onClick={() => navigate('/invite')} className="py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c' }}>
            <Share2 size={16} /> Invite Page
          </button>
        </div>
      </div>

      <div className="px-4 space-y-2 mb-4">
        {levels.map((lvl, i) => (
          <div key={lvl.level} className="rounded-2xl p-4" style={{
            background: i === 0 ? 'linear-gradient(135deg, #1a1400, #2a2000)' : '#151515',
            border: i === 0 ? '1px solid rgba(201,168,76,0.4)' : '1px solid #2a2a2a',
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-white text-base">Level {lvl.level}</p>
                <p className="text-gray-500 text-xs mt-0.5">{lvl.members.length} Members</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">Rate</p>
                  <p className="text-[#c9a84c] font-black text-2xl">{lvl.rate}</p>
                </div>
                <div style={{ width: 1, height: 40, background: 'rgba(201,168,76,0.2)' }} />
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">Commission</p>
                  <p className="text-white font-bold text-sm">{formatUGX(lvl.commission)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalTeam === 0 ? (
        <div className="mx-4 rounded-2xl p-10 text-center" style={{ background: '#151515' }}>
          <Users size={32} className="text-gray-600 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">No Members yet</p>
          <p className="text-gray-700 text-xs mt-1">Share your invite link to grow your team</p>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {levels.map(lvl => lvl.members.length > 0 && (
            <div key={lvl.level} className="space-y-2">
              <h3 className="text-white font-semibold text-sm">Level {lvl.level} Members ({lvl.members.length})</h3>
              {lvl.members.map((member: any) => (
                <div key={member.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
                  <div>
                    <p className="text-white text-sm font-medium">{member.phone}</p>
                    <p className="text-gray-500 text-xs">{new Date(member.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[#c9a84c] text-xs font-semibold">Lv{lvl.level} • {formatUGX(member.balance||0)}</span>
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