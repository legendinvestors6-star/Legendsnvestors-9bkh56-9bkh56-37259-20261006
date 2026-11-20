import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

function toUgandaE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  let nationalNumber: string;
  if (digits.startsWith('256')) {
    nationalNumber = digits.slice(3);
  } else if (digits.startsWith('0')) {
    nationalNumber = digits.slice(1);
  } else {
    nationalNumber = digits;
  }
  if (!/^\d{9}$/.test(nationalNumber)) {
    throw new Error('Enter a valid Ugandan number, such as 0751234567.');
  }
  return `+256${nationalNumber}`;
}

function toLocalPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('256')) return '0' + digits.slice(3);
  if (digits.startsWith('0')) return digits;
  return '0' + digits;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referral, setReferral] = useState(() => {
    const code = new URLSearchParams(location.search).get('ref')?.trim() || '';
    return code.toLowerCase() === 'null' ? '' : code;
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const cleanName = fullName.trim();
    const enteredReferral = referral.trim();
    const cleanReferral = enteredReferral.toLowerCase() === 'null' ? '' : enteredReferral.toUpperCase();

    if (!cleanName || !phone.trim() || !password) {
      toast.error('Fill all required fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    let phoneE164: string;
    try {
      phoneE164 = toUgandaE164(phone);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enter a valid phone number');
      return;
    }

    const localPhone = toLocalPhone(phone);
    setLoading(true);

    try {
      // 1. Check if phone already exists in users table
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone', localPhone)
        .maybeSingle();

      if (existing) {
        toast.error('This phone number is already registered. Please login.');
        navigate('/login');
        return;
      }

      // 2. Create user directly in users table - NO OTP, NO Twilio
      // Bonus 9000 credited immediately
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          phone: localPhone,
          password: password,
          full_name: cleanName,
          balance: 9000,
          referred_by: cleanReferral || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newUser) throw new Error('Could not create account. Try again.');

      // 3. Save session locally so Home / Admin can see user
      localStorage.setItem('current_user', JSON.stringify(newUser));
      localStorage.setItem('user_phone', localPhone);

      toast.success('Account created! UGX 9,000 registration bonus credited.');
      navigate('/home');
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-8" style={{ background: '#0a0a0a' }}>
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black text-white tracking-widest">LEGEND</h1>
        <p className="text-[#c9a84c] text-[11px] mt-1 tracking-[0.3em]">INVESTORS PLATFORM</p>
      </div>

      <div className="rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        <h2 className="text-white font-bold text-lg">Create Account</h2>
        <p className="text-gray-500 text-xs mb-5">Join LEGEND Investors Platform - UGX 9,000 bonus on signup</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Full Name *</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" autoComplete="name" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{ background: '#1f1f1f', border: '1px solid #333' }} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Phone Number *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0751234567 or +256751234567" autoComplete="tel" inputMode="tel" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{ background: '#1f1f1f', border: '1px solid #333' }} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Password *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" autoComplete="new-password" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{ background: '#1f1f1f', border: '1px solid #333' }} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" autoComplete="new-password" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{ background: '#1f1f1f', border: '1px solid #333' }} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Referral Code (Optional)</label>
            <input value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="Enter referral code, if you have one" autoComplete="off" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{ background: '#1f1f1f', border: '1px solid #333' }} />
          </div>
        </div>

        <button type="button" onClick={handleRegister} disabled={loading} className="w-full py-4 rounded-xl font-bold text-black text-base mt-6 disabled:opacity-60" style={{ background: '#c9a84c' }}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p className="text-center text-gray-500 text-xs mt-4">
          Already have an account? <Link to="/login" className="text-[#c9a84c] font-bold">Login</Link>
        </p>
      </div>
    </div>
  );
        }
