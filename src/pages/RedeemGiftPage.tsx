import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, Gift, Tag } from 'lucide-react';
import { TELEGRAM_LINK } from '@/constants/products';
import { getCurrentUser } from '@/lib/storage';

const formatUGX = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function RedeemGiftPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    setCurrentUser(user);
    setAuthReady(true);
  }, [navigate]);

  if (!authReady || !currentUser) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  }

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error('Please enter a gift code');
      return;
    }

    setLoading(true);

    try {
      const enteredCode = code.trim().toUpperCase();

      const { redeemGiftCode } = await import('@/lib/storage');
      const result = await redeemGiftCode(currentUser.id, enteredCode);

      if (!result.success) {
        toast.error(result.message || 'Invalid gift code');
        return;
      }

      const nextBalance = Number(currentUser.balance || 0) + Number(result.amount || 0);
      setCurrentUser({ ...currentUser, balance: nextBalance });
      toast.success(result.message || `Gift code redeemed! +${formatUGX(result.amount || 0)}`);
      setCode('');
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

          <a
            href={TELEGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5"
            style={{ background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.2)' }}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#0088cc' }}>
              <span className="text-white text-xs font-bold">✈</span>
            </div>
            <span className="text-[#0088cc] text-sm">Official Telegram Group</span>
          </a>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1.5">
              <Tag size={13} className="text-[#c9a84c]" />
              Gift Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter gift code (e.g. ABC12345)"
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none text-white uppercase tracking-widest placeholder-gray-600"
              style={{ background: '#1e1e1e', border: '1.5px solid #333' }}
            />
          </div>

          <button
            onClick={handleRedeem}
            disabled={loading}
            className="w-full gold-gradient py-4 rounded-xl font-bold text-black disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Gift size={18} />
            {loading ? 'Redeeming...' : 'Confirm'}
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
