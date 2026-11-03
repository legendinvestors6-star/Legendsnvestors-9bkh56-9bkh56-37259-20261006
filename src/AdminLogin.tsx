import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User, Shield } from 'lucide-react';
import { setAdminSession, getAdminSession } from '@/lib/storage';
import { useEffect } from 'react';

// Admin credentials — change these to update login details
const ADMIN_USERNAME = 'nabakooza@admin.com';
const ADMIN_PASSWORD = 'nabakooza123';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getAdminSession()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = () => {
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const usernameMatch = username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase();
      const passwordMatch = password === ADMIN_PASSWORD;
      if (usernameMatch && passwordMatch) {
        setAdminSession(true);
        toast.success('Welcome back, Admin!');
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('Invalid username or password. Please try again.');
        toast.error('Login failed — check your credentials.');
      }
      setLoading(false);
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0a0f2e 0%, #1a1a4e 100%)' }}
    >
      {/* Top decoration */}
      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
        >
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-white text-2xl font-bold tracking-wide">Admin Panel</h1>
        <p className="text-amber-300 text-sm mt-1">Samsung Earnings — Secure Access</p>
      </div>

      {/* Form */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10">
        <h2 className="text-gray-900 text-xl font-bold mb-1">Administrator Login</h2>
        <p className="text-gray-400 text-sm mb-6">Full platform control. Restricted access only.</p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
            <span className="text-red-500 text-sm">⚠️</span>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Username */}
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1.5 block">
              Admin Username
            </label>
            <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50 focus-within:border-amber-400 transition-colors">
              <User className="w-5 h-5 text-amber-500 mr-3 shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="nabakooza@admin.com"
                className="flex-1 bg-transparent text-gray-800 outline-none text-base"
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1.5 block">
              Password
            </label>
            <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50 focus-within:border-amber-400 transition-colors">
              <Lock className="w-5 h-5 text-amber-500 mr-3 shrink-0" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="Enter admin password"
                className="flex-1 bg-transparent text-gray-800 outline-none text-base"
                autoComplete="current-password"
              />
              <button
                onClick={() => setShowPass(!showPass)}
                type="button"
                className="ml-2 p-1"
              >
                {showPass
                  ? <EyeOff className="w-5 h-5 text-gray-400" />
                  : <Eye className="w-5 h-5 text-gray-400" />
                }
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-6 py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95 disabled:opacity-60 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Verifying...
            </span>
          ) : 'Login to Admin Panel'}
        </button>

        <div className="flex items-center justify-center mt-5">
          <button
            onClick={() => navigate('/login')}
            className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            ← Back to User Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
