import { useState, useEffect } from 'react';
import { ChevronLeft, Gift, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { TELEGRAM_LINK } from '@/constants/products';

const formatUGX = (n: number) => `UGX ${Number(n||0).toLocaleString()}`;

export default function RedeemGiftPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    })();
  }, [navigate]);

  if (!currentUser) return null;

  const handleRedeem = async () => {
    if (!code.trim()) { toast.error('Please enter a gift code'); return; }
    setLoading(true);
    try {
      const enteredCode = code.trim().toUpperCase();

      // 1. Find gift code
      const { data: gift, error: findError } = await supabase
        .from('gift_codes')
        .select('*')
        .eq('code', enteredCode)
        .single();

      if (findError || !gift) {
        toast.error('Invalid gift code');
        setLoading(false);
        return;
      }

      if (gift.used_by) {
        toast.error('This gift code has already been used');
        setLoading(false);
        return;
      }

      if (gift.expires_at && new Date(gift.expires_at) < new Date()) {
        toast.error('This gift code has expired');
        setLoading(false);
        return;
      }

      // 2. Mark as used
      const { error: updateError } = await supabase
        .from('gift_codes')
        .update({ used_by: currentUser.id, used_at: new Date().toISOString() })
        .eq('id', gift.id);

      if (updateError) throw updateError;

      // 3. Credit user balance
      const newBalance = Number(currentUser.balance || 0) + Number(gift.amount);
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', currentUser.id);

      if (balanceError) throw balanceError;

      // 4. Add transaction record
      await supabase.from('transactions').insert({
        user_id: currentUser.id,
        type: 'bonus',
        amount: gift.amount,
        status: 'completed',
        description: `Gift code redeemed: ${gift.code} ${gift.note ? '- ' + gift.note : ''}`
      });

      toast.success(`Gift code redeemed! +${formatUGX(gift.amount)}`);
      setCode('');
      setCurrentUser({ ...currentUser, balance: newBalance });

    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Redemption failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg">Redeem Gift</h1>
      </div>

      <div className="px-4 mt-5 space-y-4">
        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid rgba(201,168,76,0.2)' }}>
          <h2 className="font-black text-white">Legend Investors</h2>
          <p className="text-gray-500 text-sm mb-5">Redeem Gift Code - Balance: {formatUGX(currentUser.balance || 0)}</p>

          <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5"
            style={{ background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.2)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#0088cc' }}><span className="text-white text-xs font-bold">✈</span></div>
            <span className="text-[#0088cc] text-sm">Official Telegram Group</span>
          </a>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1.5"><Tag size={13} className="text-[#c9a84c]" /> Gift Code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Enter gift code (e.g. ABC12345)"
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none text-white uppercase tracking-widest placeholder-gray-600"
              style={{ background: '#1e1e1e', border: '1.5px solid #333' }} />
          </div>

          <button onClick={handleRedeem} disabled={loading}
            className="w-full gold-gradient py-4 rounded-xl font-bold text-black disabled:opacity-60 flex items-center justify-center gap-2">
            <Gift size={18} />{loading ? 'Redeeming...' : 'Confirm'}
          </button>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
          <p className="text-[#c9a84c] text-sm font-semibold mb-2">How to get gift codes?</p>
          <div className="space-y-1.5 text-xs text-gray-500">
            <p>• Gift codes are created by admin in Admin Panel</p>
            <p>• Join Telegram group to receive codes</p>
            <p>• Each code can only be used once</p>
            <p>• Balance is added instantly</p>
          </div>
        </div>
      </div>
    </div>
  );
}