import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Shield, ListOrdered, Headphones, CreditCard, Gift, LogOut, ChevronRight, CreditCard as RechargeIcon, ArrowDownToLine, Activity, TrendingUp, UserCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { getCurrentUser, setCurrentUser, formatUGX } from '@/lib/storage';

export default function MinePage() {
  const navigate = useNavigate();
  const [currentUser, setUser] = useState(getCurrentUser());

  if (!currentUser) { navigate('/'); return null; }

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const menuItems = [
    { icon: UserCircle, label: 'Edit Profile', path: '/profile' },
    { icon: Info, label: 'About Us', path: '/about' },
    { icon: Shield, label: 'Regulation', path: '/regulation' },
    { icon: ListOrdered, label: 'Records', path: '/records' },
    { icon: Headphones, label: 'Customer Service', path: '/customer-service' },
    { icon: CreditCard, label: 'Bind Bank Card', path: '/bind-card' },
    { icon: TrendingUp, label: 'Recharge Status', path: '/recharge-status' },
    { icon: Activity, label: 'Withdrawal Status', path: '/withdraw-status' },
    { icon: Gift, label: 'Redeem Gift', path: '/redeem' },
  ];

  return (
    <AppLayout>
      {/* Profile Header */}
      <div className="mx-4 mt-4 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #1a1400, #2a2000)', border: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)', border: '2px solid #c9a84c' }}>
            <div className="flex flex-col gap-0.5">
              <div className="w-4 h-0.5 bg-[#c9a84c] rounded-full" />
              <div className="w-4 h-0.5 bg-[#c9a84c] rounded-full" />
              <div className="w-4 h-0.5 bg-[#c9a84c] rounded-full" />
            </div>
          </div>
          <div>
            <p className="text-white font-bold">{currentUser.phone}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-black px-2 py-0.5 rounded-full gold-gradient">Lv{currentUser.level}</span>
              <span className="text-gray-500 text-xs">Referral: {currentUser.referralCode}</span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-gray-500 text-xs mb-1">Balance</p>
          <p className="text-[#c9a84c] text-3xl font-black">{formatUGX(currentUser.balance)}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: RechargeIcon, label: 'Recharge', path: '/recharge' },
            { icon: ArrowDownToLine, label: 'Withdraw', path: '/withdraw' },
            { icon: ListOrdered, label: 'Records', path: '/records' },
          ].map(action => {
            const Icon = action.icon;
            return (
              <button key={action.label} onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-1.5 py-2 rounded-xl"
                style={{ background: 'rgba(201,168,76,0.1)' }}>
                <Icon size={18} className="text-[#c9a84c]" />
                <span className="text-gray-400 text-[10px]">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Center Banner */}
      <button onClick={() => navigate('/tasks')} className="mx-4 mt-3 rounded-2xl overflow-hidden w-[calc(100%-2rem)]">
        <div className="relative">
          <img src="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=480&h=100&fit=crop" alt="" className="w-full h-20 object-cover" />
          <div className="absolute inset-0 flex items-center justify-between px-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div>
              <p className="text-white font-bold text-base">Task Center</p>
              <p className="text-gray-300 text-xs">Complete tasks and get generous bonuses</p>
            </div>
            <span className="text-[#c9a84c] text-sm font-semibold">GO now -&gt;</span>
          </div>
        </div>
      </button>

      {/* Menu Items */}
      <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button key={item.label} onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-4 transition-colors hover:bg-white/5"
              style={{ borderBottom: i < menuItems.length - 1 ? '1px solid #222' : 'none' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)' }}>
                <Icon size={15} className="text-[#c9a84c]" />
              </div>
              <span className="flex-1 text-left text-gray-300 text-sm">{item.label}</span>
              <ChevronRight size={14} className="text-gray-600" />
            </button>
          );
        })}
      </div>

      {/* Sign Out */}
      <div className="mx-4 mt-3 mb-4">
        <button onClick={handleSignOut} className="w-full py-4 rounded-2xl font-bold text-black gold-gradient flex items-center justify-center gap-2">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </AppLayout>
  );
}
