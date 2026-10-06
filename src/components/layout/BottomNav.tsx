import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Package, Users, User } from 'lucide-react';

const tabs = [
  { label: 'Home', path: '/home', icon: Home },
  { label: 'Product', path: '/product', icon: Package },
  { label: 'Team', path: '/team', icon: Users },
  { label: 'Mine', path: '/mine', icon: User },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50"
      style={{ background: '#161616', borderTop: '1px solid #2a2a2a' }}>
      <div className="flex">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center py-2.5 gap-1 transition-all"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isActive ? 'gold-gradient' : 'bg-transparent'
              }`}>
                <Icon size={18} className={isActive ? 'text-black' : 'text-gray-500'} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-gold' : 'text-gray-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
