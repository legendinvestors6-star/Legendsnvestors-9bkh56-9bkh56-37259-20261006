import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Clock, CheckCircle, XCircle, Timer } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { getCurrentUser, getUserProducts, purchaseProduct, formatUGX } from '@/lib/storage';
import { PRODUCTS } from '@/constants/products';
import { toast } from 'sonner';
import type { UserProduct } from '@/types';

const BMW_IMAGES = [
  'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=120&h=120&fit=crop',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=120&h=120&fit=crop',
];

function getRemainingMs(endDate: string): number {
  return Math.max(0, new Date(endDate).getTime() - Date.now());
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function getRemainingPercent(purchaseDate: string, endDate: string): number {
  const total = new Date(endDate).getTime() - new Date(purchaseDate).getTime();
  const elapsed = Date.now() - new Date(purchaseDate).getTime();
  return Math.max(0, Math.min(100, ((total - elapsed) / total) * 100));
}

// Active product card with live countdown
function ActiveProductCard({ userProduct, productDef }: { userProduct: UserProduct; productDef: typeof PRODUCTS[0] }) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(userProduct.endDate));
  const [expired, setExpired] = useState(remainingMs <= 0);

  useEffect(() => {
    if (expired) return;
    const interval = setInterval(() => {
      const ms = getRemainingMs(userProduct.endDate);
      setRemainingMs(ms);
      if (ms <= 0) {
        setExpired(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userProduct.endDate, expired]);

  const percent = getRemainingPercent(userProduct.purchaseDate, userProduct.endDate);
  const totalSec = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{
      background: expired ? '#151515' : 'linear-gradient(135deg, #1a1100, #201800)',
      border: expired ? '1px solid #333' : '1px solid rgba(201,168,76,0.4)',
    }}>
      <div className="flex gap-3 p-4">
        <div className="relative flex-shrink-0">
          <img
            src={BMW_IMAGES[productDef.vip % BMW_IMAGES.length]}
            alt={productDef.name}
            className="w-20 h-20 rounded-xl object-cover"
            style={{ border: '1px solid #2a2a2a', filter: expired ? 'grayscale(1) opacity(0.5)' : 'none' }}
          />
          <div className="absolute top-1 left-1 text-[9px] font-black text-black px-1.5 py-0.5 rounded-full gold-gradient">
            VIP{productDef.vip}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-bold text-sm">{productDef.name}</h3>
            {expired ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <XCircle size={10} /> Expired
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <CheckCircle size={10} /> Active
              </span>
            )}
          </div>

          <div className="space-y-0.5 mb-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Daily income:</span>
              <span className="text-[#c9a84c] font-semibold">{formatUGX(productDef.dailyIncome)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Purchase:</span>
              <span className="text-gray-400">{new Date(userProduct.purchaseDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Expires:</span>
              <span className="text-gray-400">{new Date(userProduct.endDate).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Countdown */}
          {!expired ? (
            <div className="rounded-xl p-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="flex items-center gap-1 mb-1">
                <Timer size={10} className="text-[#c9a84c]" />
                <p className="text-[10px] text-gray-500">Time remaining</p>
              </div>
              <div className="flex gap-1">
                {[
                  { val: days, unit: 'd' },
                  { val: hours, unit: 'h' },
                  { val: mins, unit: 'm' },
                  { val: secs, unit: 's' },
                ].map((item, i) => (
                  <div key={i} className="flex items-end gap-0.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm tabular-nums"
                      style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>
                      {String(item.val).padStart(2, '0')}
                    </div>
                    <span className="text-gray-600 text-[9px] mb-0.5">{item.unit}</span>
                    {i < 3 && <span className="text-[#c9a84c] font-bold text-xs mb-0.5 mx-0.5">:</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-red-400 text-xs font-semibold">Term ended — no more daily income</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!expired && (
        <div className="px-4 pb-3">
          <div className="flex justify-between text-[10px] text-gray-600 mb-1">
            <span>Progress</span>
            <span>{(100 - percent).toFixed(1)}% elapsed</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
            <div className="h-full rounded-full gold-gradient transition-all" style={{ width: `${100 - percent}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [buying, setBuying] = useState<number | null>(null);
  const [showMyProducts, setShowMyProducts] = useState(false);
  const [tick, setTick] = useState(0);

  // Tick to keep userProducts fresh
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  if (!currentUser) { navigate('/'); return null; }

  const userProductsRaw = getUserProducts(currentUser.id);
  // Auto-check expiry
  const userProducts = userProductsRaw.map(up => ({
    ...up,
    status: getRemainingMs(up.endDate) <= 0 ? 'expired' as const : up.status,
  }));
  const activeProducts = userProducts.filter(p => p.status === 'active');
  const expiredProducts = userProducts.filter(p => p.status === 'expired');

  const handleBuy = (productId: number, price: number, dailyIncome: number, term: number, vip: number) => {
    if (currentUser.balance < price) {
      toast.error('Insufficient balance. Please recharge first.');
      navigate('/recharge');
      return;
    }
    setBuying(productId);
    setTimeout(() => {
      const result = purchaseProduct(currentUser.id, productId, price, dailyIncome, term);
      if (result.success) {
        toast.success(`VIP ${vip} purchased! Daily income: +${formatUGX(dailyIncome)}`);
        setCurrentUser(getCurrentUser());
      } else {
        toast.error(result.message);
      }
      setBuying(null);
    }, 600);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-white text-xl font-black flex items-center gap-2">
          <span className="w-1 h-6 gold-gradient rounded-full inline-block" />
          Product Center
        </h1>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-3 rounded-2xl p-4 grid grid-cols-2 gap-3" style={{ background: '#151515', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div>
          <p className="text-3xl font-black text-[#c9a84c]">{activeProducts.length}</p>
          <button onClick={() => setShowMyProducts(!showMyProducts)} className="text-gray-500 text-xs flex items-center gap-1">
            My products {showMyProducts ? '▲' : '▼'}
          </button>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-[#c9a84c]">{formatUGX(currentUser.balance)}</p>
          <button onClick={() => navigate('/records')} className="text-gray-500 text-xs">My income &gt;</button>
        </div>
      </div>

      {/* My Active Products */}
      {showMyProducts && userProducts.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-[#c9a84c]" />
            <h3 className="text-white font-bold text-sm">My Products</h3>
            {expiredProducts.length > 0 && (
              <span className="text-[10px] text-red-400 px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)' }}>
                {expiredProducts.length} expired
              </span>
            )}
          </div>
          {userProducts.map(up => {
            const def = PRODUCTS.find(p => p.id === up.productId);
            if (!def) return null;
            return <ActiveProductCard key={up.id} userProduct={up} productDef={def} />;
          })}
        </div>
      )}

      {/* Available Products */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={14} className="text-[#c9a84c]" />
          <h3 className="text-white font-bold text-sm">Available Products</h3>
        </div>
      </div>

      <div className="px-4 space-y-3 pb-4">
        {PRODUCTS.map((product, i) => (
          <div key={product.id} className="rounded-2xl overflow-hidden" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <div className="flex gap-3 p-4">
              <div className="relative flex-shrink-0">
                <img
                  src={BMW_IMAGES[i % BMW_IMAGES.length]}
                  alt={product.name}
                  className="w-24 h-24 rounded-xl object-cover"
                  style={{ border: '1px solid #2a2a2a' }}
                />
                <div className="absolute top-1 left-1 text-[9px] font-black text-black px-1.5 py-0.5 rounded-full gold-gradient">
                  VIP{product.vip}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm mb-2">{product.name}</h3>
                <p className="text-[#c9a84c] font-black text-lg">{formatUGX(product.price)}</p>
                <div className="mt-1 space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Term:</span>
                    <span className="text-white font-medium">{product.term}-day</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Daily income:</span>
                    <span className="text-[#c9a84c] font-semibold">{formatUGX(product.dailyIncome)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total income:</span>
                    <span className="text-white font-medium">{formatUGX(product.totalIncome)}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleBuy(product.id, product.price, product.dailyIncome, product.term, product.vip)}
              disabled={buying === product.id}
              className="w-full py-3.5 font-bold text-black text-sm gold-gradient disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} />
              {buying === product.id ? 'Processing...' : 'BUY NOW'}
            </button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
