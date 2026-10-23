import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Users, Share2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase'; // <-- your supabase client

export default function TeamPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [level1, setLevel1] = useState<any[]>([]);
  const [level2, setLevel2] = useState<any[]>([]);
  const [level3, setLevel3] = useState<any[]>([]);
  const [commissions, setCommissions] = useState({ level1: 0, level2: 0, level3: 0 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile) { navigate('/login'); return; }
      setCurrentUser(profile);

      // Level 1: users I referred
      const { data: l1 } = await supabase.from('profiles').select('id, phone, created_at').eq('referred_by', user.id);
      const l1Data = l1 || [];
      setLevel1(l1Data);

      // Level 2: users referred by my level1
      let l2Data: any[] = [];
      if (l1Data.length > 0) {
        const l1Ids = l1Data.map((u: any) => u.id);
        const { data: l2 } = await supabase.from('profiles').select('id, phone, created_at').in('referred_by', l1Ids);
        l2Data = l2 || [];
        setLevel2(l2Data);
      }

      // Level 3: users referred by level2
      let l3Data: any[] = [];
      if (l2Data.length > 0) {
        const l2Ids = l2Data.map((u: any) => u.id);
        const { data: l3 } = await supabase.from('profiles').select('id, phone, created_at').in('referred_by', l2Ids);
        l3Data = l3 || [];
        setLevel3(l3Data);
      }

      // Commissions sum
      const { data: comms } = await supabase.from('commissions').select('level, amount').eq('user_id', user.id);
      if (comms) {
        const c1 = comms.filter(c => c.level === 1).reduce((s, c) => s + c.amount, 0);
        const c2 = comms.filter(c => c.level === 2).reduce((s, c) => s + c.amount, 0);
        const c3 = comms.filter(c => c.level === 3).reduce((s, c) => s + c.amount, 0);
        setCommissions({ level1: c1, level2: c2, level3: c3 });
      }
      setLoading(false);
    })();
  }, [navigate]);

  const formatUGX = (n: number) => `UGX ${Number(n).toLocaleString()}`;

  if (loading || !currentUser) return <div className="bg-black min-h-screen flex items-center justify-center text-white">Loading...</div>;

  const totalTeam = level1.length + level2.length + level3.length;
  const totalDeposit = 0; // you can calculate from recharges if you want
  const referralUrl = `${window.location.origin}/#/register?ref=${currentUser.referral_code}`;

  const copy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const levels = [
    { level: 1, members: level1.length, rate: '27%', commission: commissions.level1 },
    { level: 2, members: level2.length, rate: '2%', commission: commissions.level2 },
    { level: 3, members: level3.length, rate: '1%', commission: commissions.level3 },
  ];

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
            <p className="text-3xl font-black text-[#c9a84c]">{formatUGX(totalDeposit)}</p>
            <p className="text-gray-500 text-xs mt-0.5">Team Deposit</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-[#c9a84c]">{formatUGX(commissions.level1