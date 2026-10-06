import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { registerUser } from '@/lib/storage';
import { REGISTRATION_BONUS } from '@/constants/products';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [refCode, setRefCode] = useState(params.get('ref') || '');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = () => {
    if (!phone.trim() || !password.trim() || !confirm.trim()) { toast.error('Please fill in all fields'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    setTimeout(() => {
      const result = registerUser(phone.trim(), password, refCode.trim() || undefined);
      if (result.success && result.user) {
        toast.success(`Welcome! You received UGX ${REGISTRATION_BONUS.toLocaleString()} bonus!`);
        navigate('/home');
      } else {
        toast.error(result.message);
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-14 pb-8 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 70%)' }} />
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <div className="w-7 h-1.5 rounded-full gold-gradient" />
              <div className="w-7 h-1.5 rounded-full gold-gradient" />
              <div className="w-7 h-1.5 rounded-full gold-gradient" />
            </div>
            <h1 className="text-3xl font-black gold-gradient-text">LEGEND</h1>
          </div>
          <p className="text-[#c9a84c] text-xs tracking-widest uppercase">Create Your Account</p>
        </div>
      </div>

      {/* Bonus Banner */}
      <div className="mx-4 mb-4 rounded-2xl p-3 flex items-center gap-3" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="w-9 h-9 gold-gradient rounded-xl flex items-center justify-center">
          <Gift size={18} className="text-black" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Registration Bonus</p>
          <p className="text-[#c9a84c] font-black">UGX {REGISTRATION_BONUS.toLocaleString()} immediately credited!</p>
        </div>
      </div>

      <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        <h2 className="text-xl font-bold text-white mb-5">Create Account</h2>
        <div className="space-y-4">
          {[
            { label: 'Phone Number', value: phone, setter: setPhone, type: 'tel', placeholder: 'e.g. 0751234567', icon: Phone },
            { label: 'Password', value: password, setter: setPassword, type: showPw ? 'text' : 'password', placeholder: 'At least 6 characters', icon: Lock, hasToggle: true },
            { label: 'Confirm Password', value: confirm, setter: setConfirm, type: 'password', placeholder: 'Re-enter password', icon: Lock },
          ].map(field => {
            const Icon = field.icon;
            return (
              <div key={field.label}>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{field.label}</label>
                <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                  <Icon size={15} className="text-gray-500 mr-2" />
                  <input
                    type={field.type} value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600"
                  />
                  {field.hasToggle && (
                    <button onClick={() => setShowPw(!showPw)} className="text-gray-500 ml-1">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Referral Code (Optional)</label>
            <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
              <Gift size={15} className="text-gray-500 mr-2" />
              <input
                type="text" value={refCode} onChange={e => setRefCode(e.target.value)}
                placeholder="Enter referral code"
                className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600 uppercase"
              />
            </div>
          </div>

          <button
            onClick={handleRegister} disabled={loading}
            className="w-full gold-gradient py-4 rounded-xl font-bold text-black text-base disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Register & Claim Bonus'}
          </button>

          <div className="text-center pt-1">
            <span className="text-gray-600 text-sm">Already have an account? </span>
            <Link to="/login" className="text-[#c9a84c] font-semibold text-sm">Sign In</Link>
          </div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
