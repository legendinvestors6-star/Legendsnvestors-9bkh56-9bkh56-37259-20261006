import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/storage';

export default function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      navigate(user.isAdmin ? '/admin' : '/home');
    } else {
      navigate('/login');
    }
  }, [navigate]);
  return (
    <div className="app-container min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex flex-col gap-1">
            <div className="w-6 h-1 rounded-full gold-gradient" />
            <div className="w-6 h-1 rounded-full gold-gradient" />
            <div className="w-6 h-1 rounded-full gold-gradient" />
          </div>
          <p className="text-2xl font-black gold-gradient-text">LEGEND</p>
        </div>
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );
}
