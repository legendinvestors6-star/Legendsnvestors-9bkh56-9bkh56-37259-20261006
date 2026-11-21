import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type View = 'login' | 'forgot' | 'status';

export default function LoginPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot
  const [resetPhone, setResetPhone] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusPhone, setStatusPhone] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const cleanPhone = phone.trim();

      // FIXED: platform_users - same table Register uses
      const { data: user, error } = await supabase
        .from('platform_users')
        .select('*')
        .eq('phone', cleanPhone)
        .eq('password', password)
        .maybeSingle();

      if (error || !user) {
        const { data: exists } = await supabase.from('platform_users').select('id').eq('phone', cleanPhone).maybeSingle();
        if (!exists) {
          toast.error('Phone not registered');
        } else {
          toast.error('Wrong password');
        }
        setLoading(false);
        return;
      }

      // Save session
      localStorage.setItem('legend_user', JSON.stringify(user));
      localStorage.setItem('legend_current_user_id', user.id);

      toast.success('Login successful!');

      // FIXED: Check admin - is_admin, isAdmin, OR your admin phone
      const isAdmin = user.is_admin === true || (user as any).isAdmin === true || user.phone === '0750000000';
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    if (!resetPhone.trim()) { toast.error('Enter your registered phone number'); return; }
    if (!newPw || newPw.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      // FIXED: platform_users
      const { data: user } = await supabase.from('platform_users').select('id').eq('phone', resetPhone.trim()).maybeSingle();
      if (!user) {
        toast.error('Phone not registered');
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.from('password_resets').insert({
        phone: resetPhone.trim(),
        new_password: newPw,
        status: 'pending'
      });
      if (error) throw error;
      toast.success('Reset request submitted!');
      setStatusPhone(resetPhone.trim());
      setView('status');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!statusPhone.trim()) { toast.error('Enter your phone number'); return; }
    setCheckingStatus(true);
    try {
      const { data } = await supabase.from('password_resets').select('*').eq('phone', statusPhone.trim()).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!data) {
        toast.error('No reset request found');
        setStatusResult(null);
      } else {
        setStatusResult(data);
      }
    } finally {
      setCheckingStatus(false);
    }
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
            <div className="flex flex-col gap-1">
              <div className="w-8 h-1.5 rounded-full gold-gradient" />
              <div className="w-8 h-1.5 rounded-full gold-gradient" />
              <div className="w-8 h-1.5 rounded-full gold-gradient" />
            </div>
            <h1 className="text-4xl font-black tracking-tight gold-gradient-text">LEGEND</h1>
          </div>
          <p className="text-[#c9a84c] text-sm font-semibold tracking-widest uppercase">Investors Platform</p>
        </div>
      </div>

      {view === 'login' && (
        <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to your account</p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1.5 block">Phone Number</label>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Phone size={16} className="text-gray-500 mr-2" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-400">Password</label>
                <button onClick={() => { setResetPhone(''); setNewPw(''); setConfirmPw(''); setView('forgot'); }} className="text-[#c9a84c] text-xs font-semibold">Forgot Password?</button>
              </div>
              <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Lock size={16} className="text-gray-500 mr-2" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="flex-1 outline-none text-sm text-white bg-transparent" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button onClick={() => setShowPw(!showPw)} className="text-gray-500 ml-2">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <button onClick={handleLogin} disabled={loading} className="w-full gold-gradient py-4 rounded-xl font-bold text-black text-base mt-2 disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="text-center pt-1">
              <span className="text-gray-600 text-sm">Don't have an account? </span>
              <Link to="/register" className="text-[#c9a84c] font-semibold text-sm">Register Now</Link>
            </div>
          </div>
        </div>
      )}

      {view === 'forgot' && (
        <div className="mx-4">
          <div className="rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <button onClick={() => setView('login')} className="flex items-center gap-1.5 text-gray-500 text-xs mb-5"><ArrowLeft size={14} /> Back to login</button>
            <h2 className="text-white font-bold text-lg mb-5">Reset Password</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1.5 block">Registered Phone Number</label>
                <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                  <Phone size={16} className="text-gray-500 mr-2" />
                  <input type="tel" value={resetPhone} onChange={e => setResetPhone(e.target.value)} placeholder="Enter your phone number" className="flex-1 outline-none text-sm text-white bg-transparent" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1.5 block">New Password</label>
                <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                  <Lock size={16} className="text-gray-500 mr-2" />
                  <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 6 characters" className="flex-1 outline-none text-sm text-white bg-transparent" />
                  <button onClick={() => setShowNewPw(!showNewPw)} className="text-gray-500 ml-2">{showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
                {strength && <div className="mt-1.5"><div className="h-1 rounded-full overflow-hidden" style={{ background: '#2a2a2a' }}><div className="h-full rounded-full" style={{ width: strength.width, background: strength.color }} /></div><p className="text-[10px] mt-0.5 font-medium" style={{ color: strength.color }}>{strength.label}</p></div>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1.5 block">Confirm New Password</label>
                <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                  <Lock size={16} className="text-gray-500 mr-2" />
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" className="flex-1 outline-none text-sm text-white bg-transparent" />
                  <button onClick={() => setShowConfirm(!showConfirm)} className="text-gray-500 ml-2">{showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>
              <button onClick={handleForgotSubmit} disabled={submitting} className="w-full gold-gradient py-4 rounded-xl font-bold text-black text-sm disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit Reset Request'}</button>
            </div>
          </div>
        </div>
      )}

      {view === 'status' && (
        <div className="mx-4">
          <div className="rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <button onClick={() => setView('forgot')} className="flex items-center gap-1.5 text-gray-500 text-xs mb-5"><ArrowLeft size={14} /> Back</button>
            <h2 className="text-white font-bold text-lg mb-1">Reset Request Status</h2>
            <div className="flex gap-2 mb-5 mt-4">
              <div className="flex-1 flex items-center rounded-xl px-3 py-3" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
                <Phone size={14} className="text-gray-500 mr-2" />
                <input type="tel" value={statusPhone} onChange={e => { setStatusPhone(e.target.value); setStatusResult(null); }} placeholder="Enter phone number" className="flex-1 outline-none text-sm text-white bg-transparent" />
              </div>
              <button onClick={handleCheckStatus} disabled={checkingStatus} className="px-4 rounded-xl font-bold text-black text-sm gold-gradient flex items-center gap-1.5"><RefreshCw size={13} className={checkingStatus ? 'animate-spin' : ''} />Check</button>
            </div>
            {statusResult && (
              <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #333' }}>
                <p className="text-white text-sm">Status: <span className="font-bold" style={{ color: statusResult.status === 'approved' ? '#22c55e' : statusResult.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>{statusResult.status}</span></p>
                <p className="text-gray-500 text-xs mt-1">Phone: {statusResult.phone}</p>
                {statusResult.status === 'approved' && <button onClick={() => setView('login')} className="w-full py-3.5 rounded-xl font-bold text-black text-sm gold-gradient mt-3">Go to Login</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
  }
