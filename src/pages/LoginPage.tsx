import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const findLoginEmail = async (value: string) => {
    const clean = value.trim();

    if (!clean) return null;

    // 1) If user entered an email directly
    if (clean.includes('@')) return clean;

    // 2) Try matching by phone
    const { data: byPhone } = await supabase
      .from('profiles')
      .select('email')
      .eq('phone', clean)
      .maybeSingle();

    if (byPhone?.email) return byPhone.email;

    // 3) Try matching by name
    const { data: byName } = await supabase
      .from('profiles')
      .select('email')
      .eq('name', clean)
      .maybeSingle();

    if (byName?.email) return byName.email;

    return null;
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      toast.error('Fill all fields');
      return;
    }

    setLoading(true);

    try {
      const email = await findLoginEmail(identifier);

      if (!email) {
        toast.error('No account found for this phone/name. Please register first.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;

      // Save app local info if you still want it
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user_id', user.id);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success('Login successful');
      navigate('/home');
    } catch (error: any) {
      toast.error(error?.message || 'Login failed');
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
        <h2 className="text-xl font-bold mb-4">Welcome Back</h2>
        <p className="text-zinc-500 text-sm mb-4">Sign in with name or phone</p>

        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Name or Phone Number"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-4 text-sm outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl"
        >
          {loading ? 'Signing...' : 'Sign In'}
        </button>

        <div className="text-center mt-4 text-sm text-zinc-500">
          No account? <Link to="/register" className="text-yellow-500">Register</Link>
        </div>
      </div>
    </div>
  );
          }
