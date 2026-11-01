import { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Load profile error:', error);
        navigate('/');
        return;
      }

      setUser(data);
      setBank(data.bank_name || '');
      setHolderName(data.account_holder_name || data.phone || '');
      setAccountNumber(data.account_number || '');
    }

    loadUser();
  }, [navigate]);

  if (!user) return null;

  const handleConfirm = async () => {
    if (!bank) {
      toast.error('Please select a bank');
      return;
    }

    if (!holderName.trim()) {
      toast.error('Please enter account holder name');
      return;
    }

    if (!accountNumber.trim()) {
      toast.error('Please enter bank account number');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        bank_name: bank,
        account_holder_name: holderName.trim(),
        account_number: accountNumber.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to save bank details. Please try again.');
      return;
    }

    toast.success('Bank card bound successfully!');
    navigate('/mine');
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      {showBankPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        >
          <div
            className="w-full max-w-[480px] rounded-t-3xl"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid #2a2a2a' }}
            >
              <button
                onClick={() => setShowBankPicker(false)}
                className="text-gray-400 text-sm"
              >
                Cancel
              </button>
              <p className="text-white font-bold">Select Bank</p>
              <button
                onClick={() => setShowBankPicker(false)}
                className="text-[#c9a84c] font-bold text-sm"
              >
                Confirm
              </button>
            </div>

            {BANKS.map((b) => (
              <button
                key={b}
                onClick={() => {
                  setBank(b);
                  setShowBankPicker(false);
                }}
                className="w-full px-5 py-4 text-left transition-colors hover:bg-white/5"
                style={{ borderBottom: '1px solid #222' }}
              >
                <span className="text-white text-base font-medium">{b}</span>
                {bank === b && <span className="float-right text-[#c9a84c]">✓</span>}
              </button>
            ))}

            <div className="h-6" />
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-3 p-4"
        style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: '#1e1e1e' }}
        >
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
        <div
          className="rounded-2xl p-5"
          style={{ background: '#151515', border: '1px solid #2a2a2a' }}
        >
          {[
            { label: '* Select Bank', value: bank || 'Please select', isSelector: true },
            {
              label: '* Account Holder Name',
              value: holderName,
              setter: setHolderName,
              placeholder: 'User name',
            },
            {
              label: '* Bank Account',
              value: accountNumber,
              setter: setAccountNumber,
              placeholder: 'Enter MTN or Airtel number',
            },
          ].map((field, i) => (
            <div key={i} className="mb-4">
              <label className="text-[#c9a84c] text-sm font-semibold mb-2 block">
                {field.label}
              </label>

              {field.isSelector ? (
                <button
                  onClick={() => setShowBankPicker(true)}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-xl text-left"
                  style={{ background: '#1e1e1e', border: '1.5px solid #333' }}
                >
                  <span className={bank ? 'text-white' : 'text-gray-600'}>
                    {field.value}
                  </span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
              ) : (
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => field.setter && field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-4 rounded-xl outline-none text-sm text-white placeholder-gray-600"
                  style={{ background: '#1e1e1e', border: '1.5px solid #333' }}
                />
              )}
            </div>
          ))}

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full gold-gradient py-4 rounded-xl font-bold text-black text-base"
          >
            {loading ? 'Saving...' : 'Confirm'}
          </button>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: '#151515', border: '1px solid #2a2a2a' }}
        >
          <p className="text-gray-500 text-xs">
            Please enter your actual MTN or Airtel Money account number. Incorrect
            information may result in failed withdrawals.
          </p>
        </div>
      </div>
    </div>
  );
                       }
