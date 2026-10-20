import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ArrowLeft, CheckCircle, Clock, XCircle, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';
import { loginUser, createPasswordReset, getPasswordResetStatus } from '@/lib/storage';

type View = 'login' | 'forgot' | 'status';

export default function LoginPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusPhone, setStatusPhone] = useState('');
  const [statusResult, setStatusResult] = useState<ReturnType<typeof getPasswordResetStatus>>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const handleLogin = () => {
    if (!identifier.trim() || !password.trim()) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    setTimeout(() => {
      const result = loginUser(identifier.trim(), password);
      if (result.success && result.user) {
        toast.success('Login successful!');
        navigate(result.user.isAdmin ? '/admin' : '/home');
      } else {
        toast.error(result.message);
      }
      setLoading(false);
    }, 500);
  };

  const handleForgotSubmit = () => {
    if (!resetPhone.trim()) { toast.error('Enter your registered phone number'); return; }
    if (!newPw || newPw.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    setSubmitting(true);
    setTimeout(() => {
      const result = createPasswordReset(resetPhone.trim(), newPw);
      if (result.success) {
        toast.success('Reset request submitted!');
        setStatusPhone(resetPhone.trim());
        setStatusResult(getPasswordResetStatus(resetPhone.trim()));
        setView('status');
      } else {
        toast.error(result.message);
      }
      setSubmitting(false);
    }, 600);
  };

  const handleCheckStatus = () => {
    if (!statusPhone.trim()) { toast.error('Enter your phone number'); return; }
    setCheckingStatus(true);
    setTimeout(() => {
      const result = getPasswordResetStatus(statusPhone.trim());
      setStatusResult(result);
      if (!result) toast.error('No reset request found for this phone number');
      setCheckingStatus(false);
    }, 500);
  };

  const pwStrength = (pwd: string) => {
    if (!pwd) return null;
    if (pwd.length < 6) return { label: 'Too short', color: '#ef4444', width: '20%' };
    if (pwd.length < 8) return { label: 'Weak', color: '#f59e0b', width: '50%' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { label: 'Strong', color: '#22c55e', width: '100%' };
    return { label: 'Medium', color: '#c9a84c', width: '70%' };
  };
  const strength = pwStrength(newPw);

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-16 pb-10 text-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.15) 0%, transparent 70%)' }} />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex flex-col gap-1"><div className="w-8 h-1.5 rounded-full gold-gradient" /><div className="w-8 h-1.5 rounded-full gold-gradient" /><div className="w-8 h-1.5 rounded-full gold-gradient" /></div>
            <h1 className="text-4xl font-black tracking-tight gold-gradient-text">LEGEND</h1>
          </div>
          <p className="text-[#c9a84c] text-sm font-semibold tracking-widest uppercase">Investors Platform</p>
          <p className="text-gray-600 text-xs mt-1">Uganda's Premium Investment Community</p>
        </div>
      </div>

      {view === 'login' && (
        <>
          <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in with name or phone</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1.5 block">Name or Phone Number</label>
                <div className="flex items-center rounded-xl px-3 py-3.5 focus-within:border-[#c9a84c] transition-colors" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                  <User size={16} className="text-gray-500 mr-2" />
                  <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Enter your name or phone number" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-400">Password</label>
                  <button onClick={() => { setResetPhone(''); setNewPw(''); setConfirmPw(''); setView('forgot'); }} className="text-[#c9a84c] text-xs font-semibold hover:underline">Forgot Password?</button>
                </div>
                <div className="flex items-center rounded-xl px-3 py-3.5 focus-within:border-[#c9a84c] transition-colors" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                  <Lock size={16} className="text-gray-500 mr-2" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  <button onClick={() => setShowPw(!showPw)} className="text-gray-500 ml-2">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <button onClick={handleLogin} disabled={loading} className="w-full gold-gradient py-4 rounded-xl font-bold text-black text-base mt-2 disabled:opacity-60">{loading ? 'Signing in...' : 'Sign In'}</button>
              <div className="text-center pt-1"><span className="text-gray-600 text-sm">Don't have an account? </span><Link to="/register" className="text-[#c9a84c] font-semibold text-sm">Register Now</Link></div>
            </div>
          </div>
          <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Registration Bonus', value: 'UGX 9,000' },
              { label: 'Daily Return', value: '27%-45%' },
              { label: 'Daily Check-in', value: 'UGX 300' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: '#151515', border: '1px solid rgba(201,168,76,0.2)' }}>
                <p className="text-[#c9a84c] font-bold text-sm">{item.value}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 text-xs mt-6 pb-8">Launching in Uganda — October 11, 2026</p>
        </>
      )}

      {view === 'forgot' && (
        <div className="mx-4">
          <div className="rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <button onClick={() => setView('login')} className="flex items-center gap-1.5 text-gray-500 text-xs mb-5 hover:text-gray-300 transition-colors"><ArrowLeft size={14} /> Back to login</button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center"><Lock size={16} className="text-black" /></div>
              <div><h2 className="text-white font-bold text-lg">Reset Password</h2><p className="text-gray-500 text-xs">Request will be reviewed by admin</p></div>
            </div>
            <div className="rounded-xl p-3 mb-5" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <p className="text-[#c9a84c] text-xs font-semibold mb-2">How it works</p>
              <div className="space-y-1.5 text-xs text-gray-400">
                <div className="flex items-start gap-2"><span className="w-4 h-4 rounded-full gold-gradient flex-shrink-0 flex items-center justify-center text-black font-black text-[9px] mt-0.5">1</span><span>Enter your registered phone number and your desired new password</span></div>
                <div className="flex items-start gap-2"><span className="w-4 h-4 rounded-full gold-gradient flex-shrink-0 flex items-center justify-center text-black font-black text-[9px] mt-0.5">2</span><span>Admin reviews and verifies your identity before approving</span></div>
                <div className="flex items-start gap-2"><span className="w-4 h-4 rounded-full gold-gradient flex-shrink-0 flex items-center justify-center text-black font-black text-[9px] mt-0.5">3</span><span>Once approved, your new password is activated — you can sign in immediately</span></div>
              </div>
            </div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-gray-400 mb-1.5 block">Registered Phone Number</label><div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}><Phone size={16} className="text-gray-500 mr-2" /><input type="tel" value={resetPhone} onChange={e => setResetPhone(e.target.value)} placeholder="Enter your phone number" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" /></div></div>
              <div><label className="text-sm font-medium text-gray-400 mb-1.5 block">New Password</label><div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}><Lock size={16} className="text-gray-500 mr-2" /><input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 6 characters" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" /><button onClick={() => setShowNewPw(!showNewPw)} className="text-gray-500 ml-2">{showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>{strength && (<div className="mt-1.5"><div className="h-1 rounded-full overflow-hidden" style={{ background: '#2a2a2a' }}><div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, background: strength.color }} /></div><p className="text-[10px] mt-0.5 font-medium" style={{ color: strength.color }}>{strength.label}</p></div>)}</div>
              <div><label className="text-sm font-medium text-gray-400 mb-1.5 block">Confirm New Password</label><div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: `1.5px solid ${confirmPw && newPw === confirmPw ? 'rgba(34,197,94,0.5)' : '#333'}` }}><Lock size={16} className="text-gray-500 mr-2" /><input type={showConfirm ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" /><div className="flex items-center gap-1 ml-2">{confirmPw && (newPw === confirmPw ? <CheckCircle size={13} className="text-green-400" /> : <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />)}<button onClick={() => setShowConfirm(!showConfirm)} className="text-gray-500">{showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div></div>
              <button onClick={handleForgotSubmit} disabled={submitting} className="w-full gold-gradient py-4 rounded-xl font-bold text-black text-sm disabled:opacity-60 flex items-center justify-center gap-2">{submitting ? 'Submitting...' : 'Submit Reset Request'}</button>
              <div className="pt-2 border-t" style={{ borderColor: '#222' }}><p className="text-gray-600 text-xs mb-2 text-center">Already submitted a request?</p><button onClick={() => { setStatusPhone(resetPhone); setView('status'); }} className="w-full py-3 rounded-xl text-xs font-semibold text-[#c9a84c]" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>Check Request Status</button></div>
            </div>
          </div>
        </div>
      )}

      {view === 'status' && (
        <div className="mx-4">
          <div className="rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <button onClick={() => setView('forgot')} className="flex items-center gap-1.5 text-gray-500 text-xs mb-5 hover:text-gray-300 transition-colors"><ArrowLeft size={14} /> Back</button>
            <h2 className="text-white font-bold text-lg mb-1">Reset Request Status</h2>
            <p className="text-gray-500 text-xs mb-5">Check the status of your password reset</p>
            <div className="flex gap-2 mb-5">
              <div className="flex-1 flex items-center rounded-xl px-3 py-3" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}><Phone size={14} className="text-gray-500 mr-2" /><input type="tel" value={statusPhone} onChange={e => { setStatusPhone(e.target.value); setStatusResult(null); }} placeholder="Enter phone number" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" /></div>
              <button onClick={handleCheckStatus} disabled={checkingStatus} className="px-4 rounded-xl font-bold text-black text-sm gold-gradient disabled:opacity-60 flex items-center gap-1.5"><RefreshCw size={13} className={checkingStatus ? 'animate-spin' : ''} />Check</button>
            </div>
            {statusResult && (() => {
              const s = statusResult;
              const isApproved = s.status === 'approved';
              const isRejected = s.status === 'rejected';
              const isPending = s.status === 'pending';
              return (
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${isApproved ? 'rgba(34,197,94,0.3)' : isRejected ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ background: isApproved ? 'rgba(34,197,94,0.08)' : isRejected ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)' }}>
                    {isApproved ? <CheckCircle size={16} className="text-green-400" /> : isRejected ? <XCircle size={16} className="text-red-400" /> : <Clock size={16} className="text-yellow-400" />}
                    <span className="font-bold text-sm" style={{ color: isApproved ? '#22c55e' : isRejected ? '#ef4444' : '#f59e0b' }}>{isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Review'}</span>
                  </div>
                  <div className="p-4 space-y-3" style={{ background: '#1a1a1a' }}>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Phone</span><span className="text-white font-semibold">{s.phone}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Submitted</span><span className="text-gray-300">{new Date(s.createdAt).toLocaleString()}</span></div>
                    {s.resolvedAt && <div className="flex justify-between text-xs"><span className="text-gray-500">Resolved At</span><span className="text-gray-300">{new Date(s.resolvedAt).toLocaleString()}</span></div>}
                    {s.note && <div className="rounded-xl p-2.5" style={{ background: 'rgba(239,68,68,0.08)' }}><p className="text-gray-500 text-[10px] mb-0.5">Admin note:</p><p className="text-red-300 text-xs">{s.note}</p></div>}
                    {isPending && <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}><p className="text-yellow-400 text-xs font-semibold mb-1">Under Review</p><p className="text-gray-500 text-[10px]">Our admin team will verify your identity and approve the request.</p></div>}
                    {isApproved && <div className="rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}><p className="text-green-400 text-xs font-semibold mb-1">Password Reset Successful!</p><p className="text-gray-500 text-[10px]">Your new password is now active.</p></div>}
                    {isApproved && <button onClick={() => setView('login')} className="w-full py-3.5 rounded-xl font-bold text-black text-sm gold-gradient mt-1">Go to Login</button>}
                    {isRejected && <button onClick={() => { setResetPhone(s.phone); setNewPw(''); setConfirmPw(''); setView('forgot'); }} className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }}>Submit New Request</button>}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}