import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const ADMIN_PHONE = '0746085840';
const ADMIN_PASSWORD = 'milly@2323';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot' | 'status'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [statusPhone, setStatusPhone] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      toast.error('Fill all fields');
      return;
    }
    setLoading(true);
    const cleanPhone = identifier.trim();
    
    try {
      // 1. ADMIN HARDCODED - Works always
      if (cleanPhone === ADMIN_PHONE && password === ADMIN_PASSWORD) {
        const adminUser = {
          id: 'admin001',
          phone: ADMIN_PHONE,
          balance: 0,
          isAdmin: true,
          is_admin: true,
          referral_code: 'ADMIN000'
        };
        localStorage.setItem('legend_user', JSON.stringify(adminUser));
        localStorage.setItem('legend_current_user', 'admin001');
        localStorage.setItem('phone', ADMIN_PHONE);
        localStorage.setItem('user_id', 'admin001');
        localStorage.setItem('user', JSON.stringify(adminUser));
        localStorage.setItem('isLoggedIn', 'true');
        toast.success('Admin login successful');
        navigate('/admin');
        return;
      }

      // 2. CHECK SUPABASE users TABLE - REAL DATABASE
      let foundUser: any = null;

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (userData && userData.password === password) {
        foundUser = userData;
      } else {
        // 3. TRY profiles TABLE (some versions use this)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', cleanPhone)
          .maybeSingle();
        
        if (profileData && profileData.password === password) {
          foundUser = profileData;
        }
      }

      // 4. TRY localStorage fallback
      if (!foundUser) {
        const localUsers = JSON.parse(localStorage.getItem('legend_users') || '[]');
        const local = localUsers.find((u: any) => u.phone === cleanPhone && u.password === password);
        if (local) foundUser = local;
      }

      if (foundUser) {
        // Check if banned
        if (foundUser.is_banned) {
          toast.error('Account is banned. Contact support.');
          setLoading(false);
          return;
        }

        // SAVE SESSION FOR ALL OTHER PAGES
        const sessionUser = {
          id: foundUser.id,
          phone: foundUser.phone,
          password: foundUser.password,
          balance: Number(foundUser.balance || 9000),
          referral_code: foundUser.referral_code || foundUser.referralCode || '',
          referralCode: foundUser.referral_code || foundUser.referralCode || '',
          isAdmin: foundUser.is_admin || foundUser.isAdmin || false,
          created_at: foundUser.created_at,
          createdAt: foundUser.created_at || foundUser.createdAt
        };

        localStorage.setItem('legend_user', JSON.stringify(sessionUser));
        localStorage.setItem('legend_current_user', foundUser.id);
        localStorage.setItem('phone', foundUser.phone);
        localStorage.setItem('user_id', foundUser.id);
        localStorage.setItem('user', JSON.stringify(sessionUser));
        localStorage.setItem('isLoggedIn', 'true');

        // Also save to legend_users for backward compatibility
        try {
          const users = JSON.parse(localStorage.getItem('legend_users') || '[]');
          if (!users.find((u: any) => u.id === foundUser.id)) {
            users.push(sessionUser);
            localStorage.setItem('legend_users', JSON.stringify(users));
          }
        } catch {}

        toast.success('Login successful');
        navigate(sessionUser.isAdmin ? '/admin' : '/home');
      } else {
        toast.error('Incorrect phone number or password');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Login failed - check internet');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetPhone.trim() || newPw.length < 6) {
      toast.error('Enter phone and password min 6 chars');
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      // Save to Supabase so admin sees it!
      const { error } = await supabase.from('password_resets').insert({
        id: Math.random().toString(36).slice(2, 11) + Date.now().toString(36),
        phone: resetPhone.trim(),
        new_password: newPw,
        newPassword: newPw,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      // Also local fallback
      try {
        const local = JSON.parse(localStorage.getItem('legend_password_resets') || '[]');
        local.unshift({
          id: Math.random().toString(36).slice(2, 11),
          phone: resetPhone.trim(),
          newPassword: newPw,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('legend_password_resets', JSON.stringify(local));
      } catch {}

      if (error) {
        console.log(error);
        // Still show success if table doesn't exist - saved locally
      }

      toast.success('Request submitted - wait for admin approval');
      setStatusPhone(resetPhone.trim());
      
      // Check status
      const { data } = await supabase.from('password_resets').select('*').eq('phone', resetPhone.trim()).order('created_at', { ascending: false }).limit(1).maybeSingle();
      setStatusResult(data);
      setMode('status');
    } catch (error: any) {
      toast.error(error?.message || 'Reset failed');
    }
  };

  const checkStatus = async () => {
    try {
      const { data } = await supabase.from('password_resets').select('*').eq('phone', statusPhone.trim()).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        setStatusResult(data);
      } else {
        // Try local
        const local = JSON.parse(localStorage.getItem('legend_password_resets') || '[]');
        const found = local.find((r: any) => r.phone === statusPhone.trim());
        setStatusResult(found);
        if (!found) toast.error('No request found');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not fetch status');
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
            <h2 className="text-xl font-bold mb-4">Welcome Back</h2>
            <p className="text-zinc-500 text-sm mb-4">Sign in with name or phone</p>
            <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Name or Phone Number" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-2 text-sm outline-none" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button onClick={() => setMode('forgot')} className="text-yellow-500 text-xs mb-4">Forgot Password?</button>
            <button onClick={handleLogin} disabled={loading} className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl">{loading ? 'Signing...' : 'Sign In'}</button>
            <div className="text-center mt-4 text-sm text-zinc-500">No account? <Link to="/register" className="text-yellow-500">Register</Link></div>
          </>
        )}
        {mode === 'forgot' && (
          <>
            <button onClick={() => setMode('login')} className="text-xs text-zinc-500 mb-4">← Back</button>
            <h2 className="font-bold mb-4">Reset Password</h2>
            <input value={resetPhone} onChange={e => setResetPhone(e.target.value)} placeholder="Registered Phone" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New Password" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm Password" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <button onClick={handleReset} className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl text-sm">Submit</button>
          </>
        )}
        {mode === 'status' && (
          <>
            <button onClick={() => setMode('forgot')} className="text-xs text-zinc-500 mb-4">← Back</button>
            <h2 className="font-bold mb-4">Check Status</h2>
            <div className="flex gap-2 mb-3">
              <input value={statusPhone} onChange={e => setStatusPhone(e.target.value)} placeholder="Phone" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm outline-none" />
              <button onClick={checkStatus} className="bg-yellow-500 text-black px-4 rounded-xl text-sm font-bold">Check</button>
            </div>
            {statusResult && <div className="bg-zinc-800 p-3 rounded-xl text-sm">Status: <b className={statusResult.status === 'approved' ? 'text-green-400' : statusResult.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}>{statusResult.status}</b><br />Phone: {statusResult.phone}</div>}
          </>
        )}
      </div>
    </div>
  );
      }
