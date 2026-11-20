import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'forgot' | 'setNewPassword';

function toLocalPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('256')) return '0' + digits.slice(3);
  if (digits.startsWith('0')) return digits;
  return '0' + digits;
}

function toE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('256')) return '+' + digits;
  if (digits.startsWith('0')) return '+256' + digits.slice(1);
  return '+256' + digits;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async () => {
    if (!phone.trim()) { toast.error('Enter your phone number'); return; }
    if (!password) { toast.error('Enter your password'); return; }

    const localPhone = toLocalPhone(phone);
    const e164Phone = toE164(phone);
    setLoading(true);

    try {
      // Try both formats: 075... and +25675...
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq.${localPhone},phone.eq.${e164Phone}`)
        .maybeSingle();

      if (error) throw error;
      if (!user) throw new Error('No account found with this phone number. Please register.');

      // Check banned - if column doesn't exist, this will be undefined = not banned
      if ((user as any).is_banned || (user as any).is_blocked) {
        toast.error('Account is restricted. Contact support.');
        return;
      }

      if (user.password !== password) {
        throw new Error('Wrong password. Try again or use Forgot Password.');
      }

      localStorage.setItem('current_user', JSON.stringify(user));
      localStorage.setItem('user_phone', user.phone);

      toast.success('Login successful');
      // Admin check - your admin phone is 0746085840
      const isAdmin = user.phone === '0746085840' || user.phone === '+256746085840' || (user as any).is_admin === true;
      navigate(isAdmin ? '/admin' : '/home');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed. Check your phone number and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (!resetPhone.trim()) { toast.error('Enter your registered phone number'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmNewPassword) { toast.error('Passwords do not match'); return; }

    const localPhone = toLocalPhone(resetPhone);
    const e164Phone = toE164(resetPhone);
    setLoading(true);

    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .or(`phone.eq.${localPhone},phone.eq.${e164Phone}`)
        .maybeSingle();

      if (!user) throw new Error('No account found with this phone number.');

      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (error) throw error;

      setPhone(resetPhone);
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setMode('login');
      toast.success('Password changed. Please sign in.');
    } catch (error) {
      console.error('Password update failed:', error);
      toast.error(error instanceof Error ? error.message : 'Could not change password');
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
            <p className="text-zinc-500 text-sm mb-4">Sign in with your registered phone number</p>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0751234567 or +256751234567" autoComplete="tel" inputMode="tel" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-2 text-sm outline-none" onKeyDown={(e) => { if (e.key === 'Enter') void handleLogin(); }} />
            <button type="button" onClick={() => setMode('forgot')} className="text-yellow-500 text-xs mb-4">Forgot Password?</button>
            <button type="button" onClick={handleLogin} disabled={loading} className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="text-center mt-4 text-sm text-zinc-500">
              No account? <Link to="/register" className="text-yellow-500">Register</Link>
            </div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <button type="button" onClick={() => setMode('login')} className="text-xs text-zinc-500 mb-4">← Back</button>
            <h2 className="font-bold mb-2">Reset Password</h2>
            <p className="text-zinc-500 text-sm mb-4">Enter your registered phone and choose a new password. No SMS needed.</p>
            <input value={resetPhone} onChange={(e) => setResetPhone(e.target.value)} placeholder="Registered phone number" autoComplete="tel" inputMode="tel" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 characters)" autoComplete="new-password" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <button type="button" onClick={handleSetNewPassword} disabled={loading} className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl text-sm disabled:opacity-60">
              {loading ? 'Updating...' : 'Change password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
