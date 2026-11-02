import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !phone || !password) { toast.error('Fill all required fields'); return; }
    if (phone.length < 10) { toast.error('Enter valid phone 07XXXXXXXX'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 chars'); return; }
    if (confirmPassword && password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    
    setLoading(true);
    try {
      const { data: exists } = await supabase.from('users').select('id').eq('phone', phone).maybeSingle();
      if (exists) { toast.error('Phone already registered! Please login'); navigate('/login'); setLoading(false); return; }

      const newId = 'user_' + Date.now() + Math.random().toString(36).slice(2,6);
      const { data, error } = await supabase.from('users').insert({
        id: newId,
        full_name: fullName,
        name: fullName,
        phone: phone,
        password: password,
        referral_code: referral || null,
        balance: 0,
        total_earnings: 0,
        created_at: new Date().toISOString()
      }).select().single();

      if (error) { toast.error('Register failed: ' + error.message); setLoading(false); return; }

      const userObj = { id: data.id, phone: data.phone, name: data.full_name || fullName, balance: 0 };
      localStorage.setItem('legend_user', JSON.stringify(userObj));
      localStorage.setItem('legend_current_user', data.id);
      localStorage.setItem('user_id', data.id);
      localStorage.setItem('phone', data.phone);

      toast.success('Account created! Welcome to LEGEND!');
      
      // FIXED: GO TO HOME - NOT RECHARGE!
      navigate('/home');

    } catch (e:any) {
      toast.error('Register failed: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-8" style={{background:'#0a0a0a'}}>
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black text-white tracking-widest">LEGEND</h1>
        <p className="text-[#c9a84c] text-[11px] mt-1 tracking-[0.3em]">INVESTORS PLATFORM</p>
      </div>
      
      <div className="rounded-3xl p-6" style={{background:'#151515', border:'1px solid #2a2a2a'}}>
        <h2 className="text-white font-bold text-lg">Create Account</h2>
        <p className="text-gray-500 text-xs mb-5">Join LEGEND Investors Platform</p>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Full Name *</label>
            <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="John Doe" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{background:'#1f1f1f', border:'1px solid #333'}} />
          </div>
          
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Phone Number *</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0751234567" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{background:'#1f1f1f', border:'1px solid #333'}} />
          </div>
          
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Password *</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{background:'#1f1f1f', border:'1px solid #333'}} />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{background:'#1f1f1f', border:'1px solid #333'}} />
          </div>
          
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Referral Code (Optional)</label>
            <input value={referral} onChange={e=>setReferral(e.target.value)} placeholder="Optional" className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none" style={{background:'#1f1f1f', border:'1px solid #333'}} />
          </div>
        </div>
        
        <button onClick={handleRegister} disabled={loading} className="w-full py-4 rounded-xl font-bold text-black text-base mt-6 disabled:opacity-60" style={{background:'#c9a84c'}}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
        
        <p className="text-center text-gray-500 text-xs mt-4">Already have account? <Link to="/login" className="text-[#c9a84c] font-bold">Login</Link></p>
      </div>
    </div>
  );
  }
