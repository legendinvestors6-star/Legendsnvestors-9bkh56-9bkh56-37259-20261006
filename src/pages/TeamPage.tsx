import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Users, Share2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { formatUGX } from '@/lib/storage';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

function getSupaUser() {
  try {
    const raw = localStorage.getItem('legend_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return {
      id: u.id,
      phone: u.phone,
      balance: u.balance || 0,
      referralCode: u.referral_code,
      referral_code: u.referral_code,
      level: u.level || 1,
    };
  } catch { return null; }
}

export default function TeamPage() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => getSupaUser());
  const [copied, setCopied] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    const load = async () => {
      // FIX: use get_team_stats, NOT from('users')
      const { data, error } = await supabase.rpc('get_team_stats', { p_phone: currentUser.phone });
      if (error) console.error(error);
      if (data) setTeam(data);
      setLoading(false);
    };
    load();
  }, []);

  if (!currentUser) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  // FIX: filter by level from the function, not by referred_by === code
  const level1 = team.filter((m: any) => m.level === 1);
  const level2 = team.filter((m: any) => m.level === 2);
  const level3 = team.filter((m: any) => m.level === 3);
  const totalTeam = team.length;
  const referralUrl = `${window.location.origin}/register?ref=${currentUser.referralCode || ''}`;

  const copy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const commissions = { level1: 0, level2: 0, level3: 0 };

  const levels = [
    { level: 1, members: level1.length, rate: '27%', commission: commissions.level1 },
    { level: 2, members: level2.length, rate: '2%', commission: commissions.level2 },
    { level: 3, members: level3.length, rate: '1%', commission: commissions.level3 },
  ];

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading team...</div>;

  const renderMembers = (title: string, members: any[], label: string) => (
    members.length > 0 ? (
      <div className="px-4 space-y-2 mb-4">
        <h3 className="text-white font-semibold text-sm">{title} ({members.length})</h3>
        {members.map((member: any) => (
          <div key={member.member_id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <div>
              <p className="text-white text-sm font-medium">{member.member_name || member.member_phone}</p>
              <p className="text-gray-500 text-xs">{member.joined_at ? new Date(member.joined_at).toLocaleDateString() : ''} - {member.member_phone}</p>
            </div>
            <span className="text-[#c9a84c] text-xs font-semibold">{label}</span>
          </div>
        ))}
      </div>
    ) : null
  );

  return (
    <AppLayout>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-white text-xl font-black flex items-center gap-2">
          <span className="w-1 h-6 gold-gradient rounded-full inline-block" />
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
            <p className="text-3xl font-black text-[#c9a84c]">{formatUGX(0)}</p>
            <p className="text-gray-500 text-xs mt-0.5">Team Deposit</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-[#c9a84c]">{formatUGX(0)}</p>
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
          <button onClick={copy} className="py-3.5 rounded-xl font-bold text-black text-sm gold-gradient flex items-center justify-center gap-2">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button onClick={() => navigate('/invite')}
            className="py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c' }}>
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
                <p className="text-gray-500 text-xs mt-0.5">{lvl.members} Members</p>
              </div>
              <div className="text-right">
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
        <>
          {renderMembers('Level 1 Members', level1, 'L1')}
          {renderMembers('Level 2 Members', level2, 'L2')}
          {renderMembers('Level 3 Members', level3, 'L3')}
        </>
      )}
      <div className="h-4" />
    </AppLayout>
  );
                             }
