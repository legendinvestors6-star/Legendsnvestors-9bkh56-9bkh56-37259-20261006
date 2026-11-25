import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, Gift, User } from 'lucide-react';
import { toast } from 'sonner';
import { REGISTRATION_BONUS } from '@/constants/products';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlRef = (params.get('ref') || '').trim().toUpperCase();
  const initialRef = urlRef || localStorage.getItem('referred_by') || '';
  const isFromLink = !!urlRef;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [refCodeInput, setRefCodeInput] = useState(initialRef);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Save ref so it survives refresh / navigation
  useEffect(() => {
    if (urlRef) {
      localStorage.setItem('referred_by', urlRef);
      setRefCodeInput(urlRef);
    }
  }, [urlRef]);

  const handleRegister = async () => {
    if (!name.trim()) { toast.error('Please enter your full name'); return; }
    if (!phone.trim() || !password.trim() || !confirm.trim()) { toast.error('Please fill in all fields'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      const cleanPhone = phone.trim();

      // 1. Check if phone already exists
      const { data: existing } = await supabase.from('platform_users').select('id').eq('phone', cleanPhone).maybeSingle();
      if (existing) {
        toast.error('Phone number already registered');
        setLoading(false);
        return;
      }

      // 2. Find who referred this user
      let referredById = null;
      const refCodeToUse = (refCodeInput || '').trim().toUpperCase();
      if (refCodeToUse) {
        const { data: referrer } = await supabase.from('platform_users').select('id').eq('referral_code', refCodeToUse).maybeSingle();
        if (referrer) {
          referredById = referrer.id;
        } else {
          toast.error('Invalid referral code');
          setLoading(false);
          return; // FIX: Do not create user with NULL referred_by
        }
      }

      // 3. Generate own referral code
      const myReferralCode = 'LEGEND' + Math.floor(100000 + Math.random() * 900000);

      // 4. Create user - WITH NAME
      const { data: newUser, error } = await supabase.from('platform_users').insert({
        name: name.trim(),
        full_name: name.trim(),
        phone: cleanPhone,
        password: password,
        wallet_balance: REGISTRATION_BONUS,
        balance: REGISTRATION_BONUS,
        referral_code: myReferralCode,
        referred_by: referredById,
        level: 1,
        cumulative_income: 0,
      }).select().single();

      if (error) throw error;

      try {
        await supabase.from('transactions').insert({
          user_id: newUser.id,
          type: 'bonus',
          amount: REGISTRATION_BONUS,
          description: 'Registration Bonus'
        });
      } catch {}

      localStorage.removeItem('referred_by');
      localStorage.setItem('legend_user', JSON.stringify(newUser));
      localStorage.setItem('legend_current_user_id', newUser.id);

      toast.success(`Welcome ${name.trim()}! You received UGX ${REGISTRATION_BONUS.toLocaleString()} bonus!`);
      navigate('/home');

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Registration failed');
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
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Milly Nakato" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
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
              <button onClick={() => setShowPw(!showPw)} className="text-gray-500 ml-1">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
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
            <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1f1f1f', border: isFromLink ? '1.5px solid #22c55e' : '1.5px solid #333' }}>
              <Gift size={15} className={isFromLink ? 'text-green-400 mr-2' : 'text-gray-500 mr-2'} />
              <input type="text" value={refCodeInput} onChange={e => setRefCodeInput(e.target.value.toUpperCase())} placeholder="Enter referral code" readOnly={isFromLink} className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600 uppercase" />
            </div>
            {isFromLink && <p className="text-green-400 text-xs mt-1.5">✓ Invited via referral link - code filled automatically</p>}
          </div>

          <button onClick={handleRegister} disabled={loading} className="w-full gold-gradient py-4 rounded-xl font-bold text-black text-base disabled:opacity-60">
            {loading ? 'Creating account...' : 'Register & Claim Bonus'}
          </button>

          <div className="text-center pt-1">
            <span className="text-gray-600 text-sm">Already have an account? </span>
            <Link to="/login" className="text-[#c9a84c] font-semibold text-sm">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
    }
