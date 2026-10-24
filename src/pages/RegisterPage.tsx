import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, Gift, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { REGISTRATION_BONUS } from '@/constants/products';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [refCode, setRefCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // FIX FOR HASH ROUTER #/register?ref=CODE
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('ref=')) {
      const qs = hash.split('?')[1];
      const code = new URLSearchParams(qs).get('ref');
      if (code) setRefCode(code.toUpperCase());
    } else {
      const code = params.get('ref');
      if (code) setRefCode(code.toUpperCase());
    }
  }, [params]);

  const handleRegister = async () => {
    if (!fullName.trim() || !phone.trim() || !password.trim() || !confirm.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if phone exists
      const { data: exists } = await supabase.from('users').select('id').eq('phone', phone.trim()).single();
      if (exists) {
        toast.error('Phone already registered');
        setLoading(false);
        return;
      }

      // 2. Find referrer by code - THIS CONNECTS REFERRAL TO DATABASE
      let referrerId = null;
      const cleanRef = refCode.trim().toUpperCase() || null;
      if (cleanRef) {
        const { data: referrer } = await supabase.from('users').select('id').eq('referral_code', cleanRef).single();
        if (referrer) {
          referrerId = referrer.id;
        } else {
          toast.error('Invalid referral code');
          setLoading(false);
          return;
        }
      }

      // 3. Generate unique referral code
      const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 4. Insert into Supabase - referral columns now exist (you ran ALTER TABLE)
      const { data, error } = await supabase.from('users').insert({
        phone: phone.trim(),
        password: password,
        name: fullName.trim(),
        referral_code: newReferralCode,
        referred_by: referrerId,
        referrer_id: referrerId,
        referred_by_code: cleanRef,
        balance: 9000,
        is_banned: false,
        is_admin: false
      }).select().single();

      if (error) throw error;

      // 5. SAVE SESSION - FIXES LOOP ON ALL DEVICES
      localStorage.setItem('phone', data.phone);
      localStorage.setItem('user_id', data.id);
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('isLoggedIn', 'true');

      toast.success(`Welcome ${fullName}! You received UGX ${REGISTRATION_BONUS.toLocaleString()} bonus!`);
      navigate('/home');
    } catch (error: any) {
      toast.error(error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-14 pb-8 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 70%)' }} />
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <div className="w-7 h-1.5 rounded-full gold-gradient" />
              <div className="w-7 h-1.5 rounded-full gold-gradient" />
              <div className="w-7 h-1.5 rounded-full gold-gradient" />
            </div>
            <h1 className="text-3xl font-black gold-gradient-text">LEGEND</h1>
          </div>
          <p className="text-[#c9a84c] text-xs tracking-widest uppercase">Create Your Account</p>
        </div>
      </div>

      <div className="mx-4 mb-4 rounded-2xl p-3 flex items-center gap-3" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="w-9 h-9 gold-gradient rounded-xl flex items-center justify-center">
          <Gift size={18} className="text-black" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Registration Bonus</p>
          <p className="text-[#c9a84c] font-black">UGX {REGISTRATION_BONUS.toLocaleString()} immediately credited!</p>
        </div>
      </div>

      <div className="mx-4 rounded-3xl p-6" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        <h2 className="text-xl font-bold text-white mb-5">Create Account</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Full Name</label>
            <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
              <User size={15} className="text-gray-500 mr-2" />
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. John Doe" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number</label>
            <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
              <Phone size={15} className="text-gray-500 mr-2" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0751234567" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Password</label>
            <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
              <Lock size={15} className="text-gray-500 mr-2" />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-500 ml-1">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Confirm Password</label>
            <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: '1.5px solid #333' }}>
              <Lock size={15} className="text-gray-500 mr-2" />
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Referral Code (Optional)</label>
            <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: refCode ? '1.5px solid #c9a84c' : '1.5px solid #333' }}>
              <Gift size={15} className={refCode ? "text-[#c9a84c] mr-2" : "text-gray-500 mr-2"} />
              <input type="text" value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())} placeholder="Enter referral code" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600 uppercase" />
            </div>
            {refCode && <p className="text-[#c9a84c] text-[10px] mt-1">✓ Invited by {refCode}</p>}
          </div>

          <button type="button" onClick={handleRegister} disabled={loading} className="w-full gold-gradient py-4 rounded-xl font-bold text-black text-base disabled:opacity-60">
            {loading ? 'Creating account...' : 'Register & Claim Bonus'}
          </button>

          <div className="text-center pt-1">
            <span className="text-gray-600 text-sm">Already have an account? </span>
            <Link to="/login" className="text-[#c9a84c] font-semibold text-sm">Sign In</Link>
          </div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}