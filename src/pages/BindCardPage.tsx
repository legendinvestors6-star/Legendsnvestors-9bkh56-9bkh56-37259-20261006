import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const BANKS = ['MTN', 'AIRTEL'];

export default function BindCardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [bank, setBank] = useState('');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Get from localStorage first - fastest, works on GitHub/Vercel
      let localUser = null;
      try {
        const raw = localStorage.getItem('legend_session') || localStorage.getItem('legend_current_user');
        if (raw) localUser = JSON.parse(raw);
      } catch {}

      if (localUser) {
        setUser(localUser);
        setBank(localUser.bankCard?.bank || '');
        setHolderName(localUser.bankCard?.holderName || localUser.phone || '');
        setAccountNumber(localUser.bankCard?.accountNumber || '');
        return;
      }

      // Try Supabase
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const u = {
          id: data.session.user.id,
          phone: data.session.user.user_metadata?.phone,
          email: data.session.user.email,
          bankCard: data.session.user.user_metadata?.bankCard,
          ...data.session.user.user_metadata
        };
        setUser(u);
        setBank(u.bankCard?.bank || '');
        setHolderName(u.bankCard?.holderName || '');
        setAccountNumber(u.bankCard?.accountNumber || '');
      } else {
        // No user at all - stay on page, don't crash
        toast.error('Please login first');
        // navigate('/login'); // Comment this to stop redirect loop while testing
      }
    };
    init();
  }, []);

  const handleConfirm = async () => {
    if (!bank) return toast.error('Please select a bank');
    if (!holderName.trim()) return toast.error('Please enter holder name');
    if (!accountNumber.trim()) return toast.error('Please enter account number');

    if (!user) {
      toast.error('No user found - please login again on this site');
      return;
    }

    setSaving(true);
    try {
      const bankCard = { bank, holderName: holderName.trim(), accountNumber: accountNumber.trim() };

      // Save to Supabase
      const { error } = await supabase.auth.updateUser({
        data: { bankCard }
      });
      if (error) console.warn("Supabase save warning:", error);

      // Save to localStorage - THIS IS WHAT MAKES IT WORK ON GITHUB/VERCEL
      const updated = { ...user, bankCard };
      localStorage.setItem('legend_session', JSON.stringify(updated));
      localStorage.setItem('legend_current_user', JSON.stringify(updated));

      toast.success('Bank card saved!');
      navigate('/mine');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', color: 'white' }}>
      <div className="flex items-center gap-3 p-4" style={{ background: '#111', borderBottom: '1px solid #222' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} />
        </button>
        <h1 className="font-bold">Bind Bank Card</h1>
      </div>

      <div className="px-4 mt-4">
        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <div className="mb-4">
            <label className="text-[#c9a84c] text-sm mb-2 block">* Select Bank</label>
            <button onClick={() => setShowBankPicker(true)} className="w-full flex justify-between px-4 py-4 rounded-xl" style={{ background: '#1e1e1e', border: '1.5px solid #333' }}>
              <span>{bank || 'Please select'}</span><ChevronDown size={16} />
            </button>
          </div>
          <div className="mb-4">
            <label className="text-[#c9a84c] text-sm mb-2 block">* Holder Name</label>
            <input value={holderName} onChange={e => setHolderName(e.target.value)} className="w-full px-4 py-4 rounded-xl text-white" style={{ background: '#1e1e1e', border: '1.5px solid #333' }} />
          </div>
          <div className="mb-4">
            <label className="text-[#c9a84c] text-sm mb-2 block">* Account Number</label>
            <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="MTN/Airtel number" className="w-full px-4 py-4 rounded-xl text-white" style={{ background: '#1e1e1e', border: '1.5px solid #333' }} />
          </div>
          <button onClick={handleConfirm} disabled={saving} className="w-full py-4 rounded-xl font-bold text-black" style={{ background: 'linear-gradient(135deg,#c9a84c,#8b6914)' }}>
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>

      {showBankPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowBankPicker(false)}>
          <div className="w-full max-w-[480px] rounded-t-3xl p-2" style={{ background: '#1a1a1a' }}>
            {BANKS.map(b => (
              <button key={b} onClick={() => { setBank(b); setShowBankPicker(false); }} className="w-full px-5 py-4 text-left border-b border-[#222] text-white">{b} {bank === b && '✓'}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
