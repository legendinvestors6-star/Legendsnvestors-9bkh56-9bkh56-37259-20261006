import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { formatUGX } from '@/lib/storage';

const BANKS = ['MTN', 'AIRTEL'];

export default function BindCardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [bank, setBank] = useState('');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let u: any = null;
      
      if (session?.user) {
        u = {
          id: session.user.id,
          email: session.user.email,
          phone: session.user.user_metadata?.phone,
          bankCard: session.user.user_metadata?.bankCard || null,
          ...session.user.user_metadata
        };
      } else {
        const raw = localStorage.getItem('legend_session');
        if (raw) u = JSON.parse(raw);
      }

      if (!u) {
        navigate('/login');
        return;
      }
      
      setUser(u);
      setBank(u.bankCard?.bank || '');
      setHolderName(u.bankCard?.holderName || u.phone || '');
      setAccountNumber(u.bankCard?.accountNumber || '');
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading) return <div style={{minHeight:'100vh',background:'#0a0a0a',display:'grid',placeItems:'center',color:'#c9a84c'}}>Loading...</div>;
  if (!user) return null;

  const handleConfirm = async () => {
    if (!bank) { toast.error('Please select a bank'); return; }
    if (!holderName.trim()) { toast.error('Please enter account holder name'); return; }
    if (!accountNumber.trim()) { toast.error('Please enter bank account number'); return; }

    setSaving(true);
    try {
      const bankCard = { bank, holderName: holderName.trim(), accountNumber: accountNumber.trim() };

      // 1. Save to Supabase (OnSpace) - THIS IS THE FIX
      const { error } = await supabase.auth.updateUser({
        data: { 
          bankCard: bankCard,
          phone: user.phone,
          referral_code: user.referralCode 
        }
      });

      if (error) throw error;

      // 2. Also save to localStorage as backup
      const updatedUser = { ...user, bankCard };
      localStorage.setItem('legend_session', JSON.stringify(updatedUser));
      localStorage.setItem('legend_current_user', JSON.stringify(updatedUser));
      
      // Update legend_users list too
      const all = JSON.parse(localStorage.getItem('legend_users') || '[]');
      const idx = all.findIndex((x:any) => x.id === user.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], bankCard };
        localStorage.setItem('legend_users', JSON.stringify(all));
      }

      toast.success('Bank card bound successfully!');
      navigate('/mine');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save: ' + (e.message || 'Try again'));
      // Still save locally even if Supabase fails
      const bankCard = { bank, holderName, accountNumber };
      localStorage.setItem('legend_session', JSON.stringify({ ...user, bankCard }));
      toast.success('Saved locally!');
      navigate('/mine');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', color: 'white' }}>
      {showBankPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-[480px] rounded-t-3xl" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
              <button onClick={() => setShowBankPicker(false)} className="text-gray-400 text-sm">Cancel</button>
              <p className="text-white font-bold">Select Bank</p>
              <button onClick={() => setShowBankPicker(false)} className="text-[#c9a84c] font-bold text-sm">Confirm</button>
            </div>
            {BANKS.map(b => (
              <button key={b} onClick={() => { setBank(b); setShowBankPicker(false); }} className="w-full px-5 py-4 text-left" style={{ borderBottom: '1px solid #222' }}>
                <span className="text-white text-base font-medium">{b}</span>
                {bank === b && <span className="float-right text-[#c9a84c]">✓</span>}
              </button>
            ))}
            <div className="h-6" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg">Bind Bank Card</h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <div className="mb-4">
            <label className="text-[#c9a84c] text-sm font-semibold mb-2 block">* Select Bank</label>
            <button onClick={() => setShowBankPicker(true)} className="w-full flex items-center justify-between px-4 py-4 rounded-xl text-left" style={{ background: '#1e1e1e', border: '1.5px solid #333' }}>
              <span className={bank ? 'text-white' : 'text-gray-600'}>{bank || 'Please select'}</span>
              <ChevronDown size={16} className="text-gray-500" />
            </button>
          </div>

          <div className="mb-4">
            <label className="text-[#c9a84c] text-sm font-semibold mb-2 block">* Account Holder Name</label>
            <input type="text" value={holderName} onChange={e => setHolderName(e.target.value)} placeholder="User name" className="w-full px-4 py-4 rounded-xl outline-none text-sm text-white placeholder-gray-600" style={{ background: '#1e1e1e', border: '1.5px solid #333' }} />
          </div>

          <div className="mb-4">
            <label className="text-[#c9a84c] text-sm font-semibold mb-2 block">* Bank Account</label>
            <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Enter MTN or Airtel number" className="w-full px-4 py-4 rounded-xl outline-none text-sm text-white placeholder-gray-600" style={{ background: '#1e1e1e', border: '1.5px solid #333' }} />
          </div>

          <button onClick={handleConfirm} disabled={saving} className="w-full py-4 rounded-xl font-bold text-black text-base" style={{ background: 'linear-gradient(135deg,#c9a84c,#8b6914)', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
