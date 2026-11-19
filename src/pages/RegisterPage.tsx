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

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [referral, setReferral] = useState(() => {
    const code = new URLSearchParams(location.search).get('ref')?.trim() || '';
    return code.toLowerCase() === 'null' ? '' : code;
  });

  const [pendingPhone, setPendingPhone] = useState('');
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const cleanName = fullName.trim();
    const enteredReferral = referral.trim();
    const cleanReferral =
      enteredReferral.toLowerCase() === 'null'
        ? ''
        : enteredReferral.toUpperCase();

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
      toast.error(
        error instanceof Error ? error.message : 'Enter a valid phone number'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        phone: phoneE164,
        password,
        options: {
          data: {
            full_name: cleanName,
            referral_code: cleanReferral || null,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Signup did not return a user. Please try again.');
      }

      setPendingPhone(phoneE164);
      setAwaitingOtp(true);
      toast.success('Enter the SMS verification code to finish registration.');
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();

    if (!pendingPhone) {
      toast.error('Phone number is missing. Please register again.');
      setAwaitingOtp(false);
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      toast.error('Enter the 6-digit SMS code');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: verifyError } =
        await supabase.auth.verifyOtp({
          phone: pendingPhone,
          token: cleanOtp,
          type: 'sms',
        });

      if (verifyError) {
        throw verifyError;
      }

      if (!authData.user) {
        throw new Error('Phone verification succeeded but no user was returned.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(
          'id, phone, full_name, balance, level, referral_code, referred_by, total_earned, registration_bonus_awarded'
        )
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        throw new Error(`Could not load your profile: ${profileError.message}`);
      }

      if (!profile.registration_bonus_awarded) {
        toast.error(
          'Your phone was verified, but the bonus is not marked as credited. Contact support before trying to register again.'
        );
        return;
      }

      toast.success('Account verified! UGX 9,000 registration bonus credited.');
      navigate('/home');
    } catch (error) {
      console.error('Phone verification failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Phone verification failed'
      );
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
        {awaitingOtp ? (
          <>
            <h2 className="text-white font-bold text-lg">Verify your phone</h2>
            <p className="text-gray-500 text-xs mb-5">
              Enter the 6-digit code sent to {pendingPhone}. Your UGX 9,000
              bonus is credited after verification.
            </p>

            <label className="text-xs text-gray-500 mb-1.5 block">
              SMS verification code
            </label>
            <input
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="123456"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none"
              style={{ background: '#1f1f1f', border: '1px solid #333' }}
            />

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-black text-base mt-6 disabled:opacity-60"
              style={{ background: '#c9a84c' }}
            >
              {loading ? 'Verifying...' : 'Verify phone'}
            </button>

            <button
              type="button"
              onClick={() => {
                setAwaitingOtp(false);
                setOtp('');
              }}
              disabled={loading}
              className="w-full text-center text-gray-500 text-xs mt-4"
            >
              Back to registration
            </button>
          </>
        ) : (
          <>
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
                  placeholder="0751234567 or +256751234567"
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
                  placeholder="Enter referral code, if you have one"
                  autoComplete="off"
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
          </>
        )}
      </div>
    </div>
  );
  }
