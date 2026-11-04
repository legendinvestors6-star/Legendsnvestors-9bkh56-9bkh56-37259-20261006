import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUser, getGiftCodes, useGiftCode, updateUser, formatUGX } from '@/lib/storage';

export default function RedeemGiftPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handleRedeem = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error('Enter gift code');
      return;
    }

    setLoading(true);
    try {
      // Get all codes
      const allCodes = getGiftCodes();
      const found = allCodes.find(c => c.code.toUpperCase() === trimmedCode);

      if (!found) {
        toast.error('Invalid code - Not found');
        setLoading(false);
        return;
      }

      // Check if already used
      if (found.usedBy) {
        toast.error('Code already used!');
        setLoading(false);
        return;
      }

      // Check expiry - 30min
      if (found.expiresAt) {
        const expTime = new Date(found.expiresAt).getTime();
        if (Date.now() > expTime) {
          toast.error('Code expired! (30min limit)');
          setLoading(false);
          return;
        }
      }

      // Redeem - FIXED: useGiftCode is the correct function
      const result = useGiftCode(trimmedCode, currentUser.id);
      
      if (result && result.success !== false) {
        // Credit balance
        const newBalance = currentUser.balance + found.amount;
        updateUser(currentUser.id, { 
          balance: newBalance,
          cumulativeIncome: (currentUser.cumulativeIncome || 0) + found.amount
        } as any);
        
        toast.success(`🎉 Success! ${formatUGX(found.amount)} added to your balance!`);
        setCode('');
        setTimeout(() => navigate('/mine'), 1500);
      } else {
        toast.error(result?.message || 'Failed to redeem - Code may be used or expired');
      }
    } catch (e: any) {
      console.error('Redeem error:', e);
      toast.error(e.message || 'Redeem failed - Try again');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      {/* Header - BLACK & GOLD */}
      <div className="flex items-center gap-3 p-4" style={{ background: 'linear-gradient(135deg, #000000, #1a1100)', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <p className="text-white font-black text-lg">Redeem Gift</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance Card - BLACK & GOLD */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <p className="text-white font-black text-base">Legend Investors</p>
          <p className="text-gray-400 text-xs mt-1">Redeem Gift Code - Balance: {formatUGX(currentUser.balance)}</p>
          
          <a href="https://t.me/legendinvestors" target="_blank" className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#3b82f6' }}>
              <Send size={14} className="text-white" />
            </div>
            <span className="text-blue-400 text-sm font-medium">Official Telegram Group</span>
          </a>
        </div>

        {/* Input - BLACK & GOLD */}
        <div className="rounded-2xl p-5" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-2 mb-3">
            <Gift size={16} className="text-[#c9a84c]" />
            <p className="text-white font-bold text-sm">Gift Code</p>
          </div>
          
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Enter gift code e.g. TOODQ62G"
            className="w-full rounded-xl px-4 py-3.5 text-sm font-black tracking-widest text-white outline-none uppercase"
            style={{ background: '#0a0a0a', border: '1px solid #333' }}
          />

          <button
            onClick={handleRedeem}
            disabled={loading || !code.trim()}
            className="w-full mt-4 py-4 rounded-xl font-black text-black text-sm flex items-center justify-center gap-2"
            style={{ 
              background: loading || !code.trim() ? '#222' : 'linear-gradient(135deg, #c9a84c, #f0c040)',
              color: loading || !code.trim() ? '#666' : '#000',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(201,168,76,0.3)'
            }}
          >
            <Gift size={16} />
            {loading ? 'Checking...' : 'Confirm'}
          </button>
        </div>

        {/* How to get codes - BLACK & GOLD */}
        <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
          <p className="text-[#c9a84c] font-bold text-sm mb-3">How to get gift codes?</p>
          <div className="space-y-2 text-[12px] text-gray-400">
            <p>• Gift codes are created by admin in Admin Panel</p>
            <p>• Join Telegram group to receive codes</p>
            <p>• Each code can only be used once</p>
            <p>• Balance is added instantly</p>
            <p>• Codes expire after 30 minutes</p>
          </div>
        </div>

        {/* Available codes preview (optional - for testing) */}
        {getGiftCodes().filter(c => !c.usedBy && (!c.expiresAt || new Date(c.expiresAt) > new Date())).length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)' }}>
            <p className="text-[#c9a84c] text-xs font-bold mb-2">💡 Active codes (for testing): {getGiftCodes().filter(c => !c.usedBy).length}</p>
            <p className="text-gray-500 text-[10px]">Codes: {getGiftCodes().filter(c => !c.usedBy).slice(0,3).map(c=>c.code).join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
        }
