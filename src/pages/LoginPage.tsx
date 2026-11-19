import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'forgot' | 'resetOtp' | 'setNewPassword';

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

export default function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [resetPhone, setResetPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async () => {
    let phoneE164: string;

    try {
      phoneE164 = toUgandaE164(phone);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Enter a valid phone number'
      );
      return;
    }

    if (!password) {
      toast.error('Enter your password');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: phoneE164,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Login did not return a user.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, is_banned')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error(`Could not load your profile: ${profileError.message}`);
      }

      if (profile.is_banned) {
        await supabase.auth.signOut();
        toast.error('Account is restricted. Contact support.');
        return;
      }

      toast.success('Login successful');
      navigate(profile.is_admin ? '/admin' : '/home');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Login failed. Check your phone number and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async () => {
    let phoneE164: string;

    try {
      phoneE164 = toUgandaE164(resetPhone);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Enter a valid phone number'
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneE164,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setResetPhone(phoneE164);
      setMode('resetOtp');
      toast.success('If the account is eligible, an SMS code has been sent.');
    } catch (error) {
      console.error('Could not send reset code:', error);
      toast.error('Could not send a reset code. Check the number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    const cleanOtp = resetOtp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      toast.error('Enter the 6-digit SMS code');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: resetPhone,
        token: cleanOtp,
        type: 'sms',
      });

      if (error) throw error;

      setResetOtp('');
      setMode('setNewPassword');
      toast.success('Phone verified. Choose a new password.');
    } catch (error) {
      console.error('Reset-code verification failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Could not verify the code'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      await supabase.auth.signOut();

      setPhone(resetPhone);
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setMode('login');

      toast.success('Password changed. Please sign in.');
    } catch (error) {
      console.error('Password update failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Could not change password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black">LEGEND</h1>
        <p className="text-yellow-500 text-sm mt-2">Investors Platform</p>
      </div>

      <div className="bg-zinc-900 rounded-3xl p-6 max-w-md mx-auto border border-zinc-800">
        {mode === 'login' && (
          <>
            <h2 className="text-xl font-bold mb-2">Welcome Back</h2>
            <p className="text-zinc-500 text-sm mb-4">
              Sign in with your registered phone number
            </p>

            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0751234567 or +256751234567"
              autoComplete="tel"
              inputMode="tel"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none"
            />

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-2 text-sm outline-none"
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleLogin();
              }}
            />

            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-yellow-500 text-xs mb-4"
            >
              Forgot Password?
            </button>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center mt-4 text-sm text-zinc-500">
              No account?{' '}
              <Link to="/register" className="text-yellow-500">
                Register
              </Link>
            </div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-xs text-zinc-500 mb-4"
            >
              ← Back
            </button>

            <h2 className="font-bold mb-2">Reset Password</h2>
            <p className="text-zinc-500 text-sm mb-4">
              We’ll send a verification code to your registered phone.
            </p>

            <input
              value={resetPhone}
              onChange={(event) => setResetPhone(event.target.value)}
              placeholder="Registered phone number"
              autoComplete="tel"
              inputMode="tel"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none"
            />

            <button
              type="button"
              onClick={handleSendResetCode}
              disabled={loading}
              className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send verification code'}
            </button>
          </>
        )}

        {mode === 'resetOtp' && (
          <>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-xs text-zinc-500 mb-4"
            >
              ← Back
            </button>

            <h2 className="font-bold mb-2">Verify your phone</h2>
            <p className="text-zinc-500 text-sm mb-4">
              Enter the 6-digit SMS code sent to {resetPhone}.
            </p>

            <input
              value={resetOtp}
              onChange={(event) =>
                setResetOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="6-digit code"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none"
            />

            <button
              type="button"
              onClick={handleVerifyResetCode}
              disabled={loading}
              className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify code'}
            </button>
          </>
        )}

        {mode === 'setNewPassword' && (
          <>
            <h2 className="font-bold mb-2">Choose a new password</h2>
            <p className="text-zinc-500 text-sm mb-4">
              Phone verified: {resetPhone}
            </p>

            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password (min 6 characters)"
              autoComplete="new-password"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none"
            />

            <input
              type="password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none"
            />

            <button
              type="button"
              onClick={handleSetNewPassword}
              disabled={loading}
              className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
            >
              {loading ? 'Updating...' : 'Change password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
        }
