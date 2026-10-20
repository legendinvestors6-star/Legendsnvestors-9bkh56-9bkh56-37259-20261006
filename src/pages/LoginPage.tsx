import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { loginUser, createPasswordReset, getPasswordResetStatus } from '@/lib/storage';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login'|'forgot'|'status'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [statusPhone, setStatusPhone] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);

  const handleLogin = () => {
    if (!identifier.trim() || !password) { toast.error('Fill all fields'); return; }
    setLoading(true);
    setTimeout(() => {
      const res = loginUser(identifier.trim(), password);
      if (res.success && res.user) {
        toast.success('Login successful');
        navigate(res.user.isAdmin ? '/admin' : '/home');
      } else {
        toast.error(res.message);
      }
      setLoading(false);
    }, 400);
  };

  const handleReset = () => {
    if (!resetPhone.trim() || newPw.length < 6) { toast.error('Enter phone and password min 6 chars'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    const res = createPasswordReset(resetPhone.trim(), newPw);
    if (res.success) {
      toast.success('Request submitted');
      setStatusPhone(resetPhone.trim());
      setStatusResult(getPasswordResetStatus(resetPhone.trim()));
      setMode('status');
    } else {
      toast.error(res.message);
    }
  };

  const checkStatus = () => {
    const r = getPasswordResetStatus(statusPhone.trim());
    setStatusResult(r);
    if (!r) toast.error('No request found');
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
            <input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Name or Phone Number" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-2 text-sm outline-none" onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
            <button onClick={()=>setMode('forgot')} className="text-yellow-500 text-xs mb-4">Forgot Password?</button>
            <button onClick={handleLogin} disabled={loading} className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl">{loading?'Signing...':'Sign In'}</button>
            <div className="text-center mt-4 text-sm text-zinc-500">No account? <Link to="/register" className="text-yellow-500">Register</Link></div>
          </>
        )}
        {mode === 'forgot' && (
          <>
            <button onClick={()=>setMode('login')} className="text-xs text-zinc-500 mb-4">← Back</button>
            <h2 className="font-bold mb-4">Reset Password</h2>
            <input value={resetPhone} onChange={e=>setResetPhone(e.target.value)} placeholder="Registered Phone" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="New Password" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Confirm Password" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 mb-3 text-sm outline-none" />
            <button onClick={handleReset} className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl text-sm">Submit</button>
          </>
        )}
        {mode === 'status' && (
          <>
            <button onClick={()=>setMode('forgot')} className="text-xs text-zinc-500 mb-4">← Back</button>
            <h2 className="font-bold mb-4">Check Status</h2>
            <div className="flex gap-2 mb-3">
              <input value={statusPhone} onChange={e=>setStatusPhone(e.target.value)} placeholder="Phone" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm outline-none" />
              <button onClick={checkStatus} className="bg-yellow-500 text-black px-4 rounded-xl text-sm font-bold">Check</button>
            </div>
            {statusResult && <div className="bg-zinc-800 p-3 rounded-xl text-sm">Status: <b>{statusResult.status}</b><br/>Phone: {statusResult.phone}</div>}
          </>
        )}
      </div>
    </div>
  );
}