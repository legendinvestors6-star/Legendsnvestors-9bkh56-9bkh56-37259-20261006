import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const REGISTRATION_BONUS = 9000;

export default function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanReferral = referral.trim();

    if (!cleanName || !cleanPhone || !password) {
      toast.error('Fill all required fields');
      return;
    }

    if (cleanPhone.length < 10) {
      toast.error('Enter a valid phone number');
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

    setLoading(true);

    try {
      const { data: existingUser, error: lookupError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (lookupError) {
        throw new Error(`Could not check phone number: ${lookupError.message}`);
      }

      if (existingUser) {
        toast.error('Phone already registered! Please log in.');
        navigate('/login');
        return;
      }

      const newId = `user_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: newId,
          full_name: cleanName,
          name: cleanName,
          phone: cleanPhone,
          password,
          referral_code: cleanReferral || null,
          balance: REGISTRATION_BONUS,
          total_earnings: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Registration failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('Registration failed: Supabase returned no user record');
      }

      console.log('Balance returned by Supabase:', data.balance);

      if (Number(data.balance) !== REGISTRATION_BONUS) {
        throw new Error(
          `Expected balance ${REGISTRATION_BONUS}, but Supabase returned ${data.balance}`
        );
      }

      const userObj = {
        id: data.id,
        phone: data.phone,
        password,
        name: data.full_name || data.name || cleanName,
        balance: Number(data.balance ?? REGISTRATION_BONUS),
        level: data.level ?? 1,
        referralCode: data.referral_code ?? '',
        cumulativeIncome: Number(data.total_earnings ?? 0),
      };

      localStorage.setItem('legend_user', JSON.stringify(userObj));
      localStorage.setItem('legend_current_user', String(data.id));
      localStorage.setItem('user_id', String(data.id));
      localStorage.setItem('phone', String(data.phone));

      toast.success('Account created! UGX 9,000 bonus credited.');
      navigate('/home');
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center px-6 py-8"
      style={{ background: '#0a0a0a' }}
    >
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black text-white tracking-widest">
          LEGEND
        </h1>
        <p className="text-[#c9a84c] text-[11px] mt-1 tracking-[0.3em]">
          INVESTORS PLATFORM
        </p>
      </div>

      <div
        className="rounded-3xl p-6"
        style={{ background: '#151515', border: '1px solid #2a2a2a' }}
      >
        <h2 className="text-white font-bold text-lg">Create Account</h2>
        <p className="text-gray-500 text-xs mb-5">
          Join LEGEND Investors Platform
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Full Name *
            </label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="John Doe"
              autoComplete="name"
              className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none"
              style={{ background: '#1f1f1f', border: '1px solid #333' }}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Phone Number *
            </label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0751234567"
              autoComplete="tel"
              inputMode="tel"
              className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none"
              style={{ background: '#1f1f1f', border: '1px solid #333' }}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Min 6 characters"
              autoComplete="new-password"
              className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none"
              style={{ background: '#1f1f1f', border: '1px solid #333' }}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
              className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none"
              style={{ background: '#1f1f1f', border: '1px solid #333' }}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Referral Code (Optional)
            </label>
            <input
              value={referral}
              onChange={(event) => setReferral(event.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none"
              style={{ background: '#1f1f1f', border: '1px solid #333' }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-black text-base mt-6 disabled:opacity-60"
          style={{ background: '#c9a84c' }}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p className="text-center text-gray-500 text-xs mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-[#c9a84c] font-bold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
  }
