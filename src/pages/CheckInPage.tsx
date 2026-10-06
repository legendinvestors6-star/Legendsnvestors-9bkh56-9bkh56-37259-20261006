import { useState } from 'react';
import { ChevronLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCurrentUser, performCheckIn, formatUGX } from '@/lib/storage';

export default function CheckInPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(getCurrentUser());

  if (!user) { navigate('/'); return null; }

  const today = new Date().toDateString();
  const hasCheckedIn = user.lastCheckIn === today;

  const handleCheckIn = () => {
    if (hasCheckedIn) { toast.info('Already checked in today!'); return; }
    setLoading(true);
    setTimeout(() => {
      const result = performCheckIn(user.id);
      if (result.success) {
        toast.success(`Check-in successful! +${formatUGX(result.reward || 0)}`);
        setUser(getCurrentUser());
      } else {
        toast.error(result.message);
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg">Daily Check-in</h1>
      </div>

      {/* Main Check-in Card */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1400, #2a2000)', border: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="p-5 flex gap-4 items-center">
          <img src="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=100&h=100&fit=crop" alt="" className="w-24 h-24 rounded-xl object-cover" style={{ border: '2px solid rgba(201,168,76,0.3)' }} />
          <div>
            <p className="text-[#c9a84c] font-bold text-base">Daily Check-in Reward</p>
            <p className="text-gray-400 text-xs mb-2">Get rewards every day</p>
            <p className="text-4xl font-black text-white">UGX 300</p>
          </div>
        </div>

        <div className="px-5 pb-5 flex items-center justify-between">
          <div>
            <p className="text-gray-400 font-semibold text-sm">Check-in days</p>
            <p className="text-gray-500 text-xs">Total days of checked in</p>
            <p className="text-4xl font-black text-[#c9a84c] mt-1">{user.checkInDays} Days</p>
          </div>
          <img src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&h=100&fit=crop" alt="" className="w-24 h-24 rounded-xl object-cover" style={{ border: '2px solid rgba(201,168,76,0.3)' }} />
        </div>
      </div>

      {/* Check-in Button */}
      <div className="mx-4 mt-4">
        <button
          onClick={handleCheckIn} disabled={hasCheckedIn || loading}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
            hasCheckedIn ? 'cursor-not-allowed' : ''
          }`}
          style={hasCheckedIn ? { background: '#2a2a2a', color: '#666' } : { background: 'linear-gradient(135deg, #b8860b, #daa520, #f0c040)', color: '#000' }}
        >
          <Calendar size={20} />
          {loading ? 'Checking in...' : hasCheckedIn ? 'Already Checked In Today' : 'Check In'}
        </button>
        {hasCheckedIn && (
          <p className="text-center text-[#c9a84c] text-sm mt-2 font-medium">✓ Come back tomorrow for your next reward!</p>
        )}
      </div>

      {/* Rules */}
      <div className="mx-4 mt-4 rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
          <Calendar size={15} className="text-[#c9a84c]" /> Check-in Rules
        </h3>
        <div className="space-y-2 text-sm text-gray-500">
          <p>1. Daily check-in reward: UGX 300.</p>
          <p>2. Check in once a day.</p>
          <p>3. Check in again after 24:00 each day.</p>
        </div>
      </div>

      {/* Accumulated */}
      <div className="mx-4 mt-4 rounded-2xl p-4" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <p className="text-gray-500 text-xs mb-1">Accumulated Check-in Bonus</p>
        <p className="text-[#c9a84c] text-2xl font-black">{formatUGX(user.checkInDays * 300)}</p>
        <p className="text-gray-600 text-xs mt-1">From {user.checkInDays} days of check-in</p>
      </div>
    </div>
  );
}
