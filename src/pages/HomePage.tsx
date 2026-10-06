import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowDownToLine, Calendar, CheckSquare, ChevronRight, Bell, Clock, TrendingUp } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import MessageNotification from '@/components/features/MessageNotification';
import { getCurrentUser, getUserProducts, creditDailyIncome, getNextPayoutMs, formatUGX } from '@/lib/storage';
import { PRODUCTS } from '@/constants/products';
import { toast } from 'sonner';
import heroBanner from '@/assets/hero-banner.jpg';

const GAME_IMAGES = [
  'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=200&h=150&fit=crop',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=200&h=150&fit=crop',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&h=150&fit=crop',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=150&fit=crop',
];

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [nextPayoutMs, setNextPayoutMs] = useState(0);
  const prevBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    const shown = sessionStorage.getItem('legend_notification_shown');
    if (!shown) { setShowNotification(true); sessionStorage.setItem('legend_notification_shown', '1'); }
  }, []);

  useEffect(() => {
    // Initialize previous balance tracking
    const user = getCurrentUser();
    if (user && prevBalanceRef.current === null) {
      prevBalanceRef.current = user.balance;
    }

    const interval = setInterval(() => {
      const user = getCurrentUser();
      if (!user) return;

      // Attempt to credit daily income
      const result = creditDailyIncome(user.id);

      if (result.credited > 0) {
        // Build a list of contributing products for the toast
        const activeProds = getUserProducts(user.id).filter(p => p.status === 'active');
        const productNames = activeProds.map(up => {
          const def = PRODUCTS.find(p => p.id === up.productId);
          return def ? `VIP ${def.vip}` : null;
        }).filter(Boolean).join(', ');

        toast.success(
          `Daily income credited: +${formatUGX(result.credited)}`,
          {
            description: productNames ? `From: ${productNames}` : 'From your active products',
            duration: 6000,
            icon: '💰',
          }
        );

        setCurrentUser(getCurrentUser());
      } else {
        // Just update state silently
        const fresh = getCurrentUser();
        setCurrentUser(fresh);
      }

      setNextPayoutMs(getNextPayoutMs(user.id));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize payout timer on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) setNextPayoutMs(getNextPayoutMs(user.id));
  }, []);

  if (!currentUser) { navigate('/'); return null; }

  const userProducts = getUserProducts(currentUser.id);
  const activeProducts = userProducts.filter(p => p.status === 'active');
  const dailyTotal = activeProducts.reduce((sum, up) => {
    const def = PRODUCTS.find(p => p.id === up.productId);
    return sum + (def?.dailyIncome || 0);
  }, 0);

  const quickActions = [
    { icon: CreditCard, label: 'Recharge', path: '/recharge', color: '#c9a84c' },
    { icon: ArrowDownToLine, label: 'Withdraw', path: '/withdraw', color: '#c9a84c' },
    { icon: Calendar, label: 'Check In', path: '/checkin', color: '#c9a84c' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks', color: '#c9a84c' },
  ];

  return (
    <AppLayout>
      {showNotification && <MessageNotification onClose={() => setShowNotification(false)} />}

      {/* Notification button */}
      <div className="flex justify-end px-4 pt-3">
        <button onClick={() => setShowNotification(true)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <Bell size={16} className="text-[#c9a84c]" />
        </button>
      </div>

      {/* Hero Banner */}
      <div className="relative mx-4 mt-2 rounded-2xl overflow-hidden">
        <img src={heroBanner} alt="Legend Investors" className="w-full h-44 object-cover" />
        <div className="absolute inset-0 flex items-end p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }}>
          <div>
            <p className="text-gray-400 text-xs">Enter</p>
            <h2 className="text-white text-3xl font-black">A New World</h2>
          </div>
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold text-black gold-gradient">
          LEGEND
        </div>
      </div>

      {/* Daily Income Countdown Timer */}
      {activeProducts.length > 0 && (
        <div className="mx-4 mt-3 rounded-2xl p-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.35)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center gold-gradient">
              <Clock size={15} className="text-black" />
            </div>
            <div>
              <p className="text-[#c9a84c] text-xs font-semibold">Next Income Payout</p>
              <p className="text-gray-500 text-[10px]">{activeProducts.length} product(s) · <span className="text-green-400 font-semibold">+{formatUGX(dailyTotal)}/day</span></p>
            </div>
          </div>
          <div className="text-right">
            {nextPayoutMs <= 0 ? (
              <div className="px-3 py-1.5 rounded-xl text-xs font-bold text-black gold-gradient flex items-center gap-1">
                <TrendingUp size={12} /> Crediting...
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.3)' }}>
                <p className="text-[#c9a84c] font-black text-base tabular-nums">{formatCountdown(nextPayoutMs)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Balance & Stats */}
      <div className="mx-4 mt-3 rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'My Balance', value: formatUGX(currentUser.balance), img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=120&h=80&fit=crop', path: '/records' },
            { label: 'Cumulative Income', value: formatUGX(currentUser.cumulativeIncome), img: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=120&h=80&fit=crop', path: '/records' },
            { label: 'Customer Service >', value: '', img: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=120&h=80&fit=crop', path: '/customer-service', isService: true },
          ].map((item, i) => (
            <button key={i} onClick={() => navigate(item.path)} className="rounded-xl overflow-hidden text-left" style={{ border: '1px solid #2a2a2a' }}>
              <img src={item.img} alt="" className="w-full h-14 object-cover" />
              {item.isService ? (
                <div className="p-2 text-center" style={{ background: '#1a1a1a' }}>
                  <p className="text-[#c9a84c] text-[10px] font-medium">{item.label}</p>
                </div>
              ) : (
                <div className="p-2 text-center" style={{ background: '#1a1a1a' }}>
                  <p className="text-white font-bold text-[10px]">{item.value}</p>
                  <p className="text-[#c9a84c] text-[9px] mt-0.5">{item.label}</p>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <button key={action.label} onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors"
                style={{ background: '#1e1e1e' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center gold-gradient">
                  <Icon size={17} className="text-black" />
                </div>
                <span className="text-[9px] text-gray-400 font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BMW Games */}
      <div className="px-4 mt-4">
        <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
          <span className="w-1 h-4 gold-gradient rounded-full inline-block" />
          BMW Games for All
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {GAME_IMAGES.map((img, i) => (
            <div key={i} className="rounded-xl overflow-hidden aspect-square" style={{ border: '1px solid #2a2a2a' }}>
              <img src={img} alt={`BMW game ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Product Center Preview */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-1 h-4 gold-gradient rounded-full inline-block" />
              Product Center
            </h3>
            <button onClick={() => navigate('/product')} className="flex items-center text-[#c9a84c] text-xs">
              View All <ChevronRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <p className="text-2xl font-black text-[#c9a84c]">{activeProducts.length}</p>
              <p className="text-gray-500 text-xs">My Products</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <p className="text-base font-black text-[#c9a84c]">{formatUGX(currentUser.balance)}</p>
              <p className="text-gray-500 text-xs">My Income</p>
            </div>
          </div>

          <div className="space-y-2">
            {PRODUCTS.slice(0, 3).map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#1e1e1e', border: '1px solid #2a2a2a' }}>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold text-black px-1.5 py-0.5 rounded gold-gradient">VIP{product.vip}</span>
                    <p className="text-white text-xs font-semibold">Legend One BMW</p>
                  </div>
                  <p className="text-[#c9a84c] font-bold text-sm">{formatUGX(product.price)}</p>
                </div>
                <button onClick={() => navigate('/product')}
                  className="text-[10px] font-bold text-black px-3 py-1.5 rounded-xl gold-gradient">
                  BUY NOW
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-4" />
    </AppLayout>
  );
}
