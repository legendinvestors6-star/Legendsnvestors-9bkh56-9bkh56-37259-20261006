import { useState } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCurrentUser, updateUser } from '@/lib/storage';

const BANKS = ['MTN', 'AIRTEL'];

export default function BindCardPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [bank, setBank] = useState(currentUser?.bankCard?.bank || '');
  const [holderName, setHolderName] = useState(currentUser?.bankCard?.holderName || currentUser?.phone || '');
  const [accountNumber, setAccountNumber] = useState(currentUser?.bankCard?.accountNumber || '');
  const [showBankPicker, setShowBankPicker] = useState(false);

  if (!currentUser) { navigate('/'); return null; }

  const handleConfirm = () => {
    if (!bank) { toast.error('Please select a bank'); return; }
    if (!holderName.trim()) { toast.error('Please enter account holder name'); return; }
    if (!accountNumber.trim()) { toast.error('Please enter bank account number'); return; }
    updateUser(currentUser.id, {
      bankCard: { bank, holderName: holderName.trim(), accountNumber: accountNumber.trim() },
    });
    toast.success('Bank card bound successfully!');
    navigate('/mine');
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      {showBankPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-[480px] rounded-t-3xl" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
              <button onClick={() => setShowBankPicker(false)} className="text-gray-400 text-sm">Cancel</button>
              <p className="text-white font-bold">Select Bank</p>
              <button onClick={() => setShowBankPicker(false)} className="text-[#c9a84c] font-bold text-sm">Confirm</button>
            </div>
            {BANKS.map(b => (
              <button key={b} onClick={() => { setBank(b); setShowBankPicker(false); }}
                className="w-full px-5 py-4 text-left transition-colors hover:bg-white/5" style={{ borderBottom: '1px solid #222' }}>
                <span className="text-white text-base font-medium">{b}</span>
                {bank === b && <span className="float-right text-[#c9a84c]">✓</span>}
              </button>
            ))}
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="w-4 h-0.5 gold-gradient rounded-full" />
            <div className="w-4 h-0.5 gold-gradient rounded-full" />
            <div className="w-4 h-0.5 gold-gradient rounded-full" />
          </div>
          <h1 className="text-white font-bold text-lg">Bind Bank Card</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          {[
            { label: '* Select Bank', value: bank || 'Please select', isSelector: true },
            { label: '* Account Holder Name', value: holderName, setter: setHolderName, placeholder: 'User name' },
            { label: '* Bank Account', value: accountNumber, setter: setAccountNumber, placeholder: 'Enter MTN or Airtel number' },
          ].map((field, i) => (
            <div key={i} className="mb-4">
              <label className="text-[#c9a84c] text-sm font-semibold mb-2 block">{field.label}</label>
              {field.isSelector ? (
                <button onClick={() => setShowBankPicker(true)}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-xl text-left"
                  style={{ background: '#1e1e1e', border: '1.5px solid #333' }}>
                  <span className={bank ? 'text-white' : 'text-gray-600'}>{field.value}</span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
              ) : (
                <input type="text" value={field.value}
                  onChange={e => field.setter && field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-4 rounded-xl outline-none text-sm text-white placeholder-gray-600"
                  style={{ background: '#1e1e1e', border: '1.5px solid #333' }} />
              )}
            </div>
          ))}

          <button onClick={handleConfirm} className="w-full gold-gradient py-4 rounded-xl font-bold text-black text-base">
            Confirm
          </button>
        </div>

        <div className="rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <p className="text-gray-500 text-xs">Please enter your actual MTN or Airtel Money account number. Incorrect information may result in failed withdrawals.</p>
        </div>
      </div>
    </div>
  );
}
