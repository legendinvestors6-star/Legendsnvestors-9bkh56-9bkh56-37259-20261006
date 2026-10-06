import { useState } from 'react';
import { ChevronLeft, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCurrentUser, createRechargeOrder, formatUGX } from '@/lib/storage';
import { MIN_DEPOSIT, MTN_ACCOUNT, MTN_NAME } from '@/constants/products';
import GoPayModal from '@/components/features/GoPayModal';
import type { RechargeOrder } from '@/types';

const QUICK_AMOUNTS = [30000, 50000, 90000, 150000, 250000, 500000];

export default function RechargePage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'MTN' | 'AIRTEL'>('MTN');
  const [phone, setPhone] = useState('');
  const [showGoPay, setShowGoPay] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<RechargeOrder | null>(null);

  if (!currentUser) { navigate('/'); return null; }

  const numAmount = parseInt(amount) || 0;

  const handleConfirm = () => {
    if (numAmount < MIN_DEPOSIT) { toast.error(`Minimum recharge is ${formatUGX(MIN_DEPOSIT)}`); return; }
    if (!phone.trim()) { toast.error('Please enter your payment account number'); return; }
    const order = createRechargeOrder(currentUser.id, numAmount, selectedMethod, phone.trim());
    setCurrentOrder(order);
    setShowGoPay(true);
  };

  const handleConfirmPaid = (paidAmt: number) => {
    toast.success('Payment submitted for verification. Pending payments are never lost.');
    setShowGoPay(false);
    navigate('/records');
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      {showGoPay && currentOrder && (
        <GoPayModal order={currentOrder} onClose={() => setShowGoPay(false)} onConfirmPaid={handleConfirmPaid} />
      )}

      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Recharge</h1>
        <button onClick={() => navigate('/recharge-status')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c' }}>
          <Activity size={13} /> History
        </button>
      </div>

      {/* Hero */}
      <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden">
        <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=480&h=120&fit=crop" alt="" className="w-full h-28 object-cover" />
        <div className="absolute inset-0 flex items-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <p className="text-white text-2xl font-black">Fast Arrival</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Quick Amounts */}
        <div className="rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <p className="text-gray-400 text-sm mb-3 font-medium">Select recharge amount</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {QUICK_AMOUNTS.map(a => (
              <button key={a} onClick={() => setAmount(a.toString())}
                className="py-2.5 rounded-xl text-sm font-bold transition-all"
                style={parseInt(amount) === a ? { background: 'linear-gradient(135deg, #c9a84c, #f0c040)', color: '#000' } : { background: '#1e1e1e', color: '#c9a84c', border: '1px solid #333' }}>
                {(a / 1000).toFixed(0)}K
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-xs mb-2">Enter other amount</p>
          <div className="flex items-center rounded-xl px-3 py-3.5 focus-within:border-[#c9a84c]" style={{ background: '#1e1e1e', border: '1.5px solid #333' }}>
            <span className="text-[#c9a84c] font-bold mr-2 text-sm">UGX</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount"
              className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
          </div>
          <p className="text-gray-600 text-xs mt-1">Minimum: {formatUGX(MIN_DEPOSIT)}</p>
        </div>

        {/* Payment Method */}
        <div className="rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <p className="text-gray-400 text-sm mb-3 font-medium">Recharge method</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(['MTN', 'AIRTEL'] as const).map(method => (
              <button key={method} onClick={() => setSelectedMethod(method)}
                className="py-3 rounded-xl font-bold text-sm transition-all"
                style={selectedMethod === method ? { background: 'linear-gradient(135deg, #c9a84c, #f0c040)', color: '#000' } : { background: '#1e1e1e', color: '#888', border: '1.5px solid #333' }}>
                {method === 'MTN' ? '📱 MoMo MTN' : '📱 Airtel Money'}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-xl px-3 py-3.5" style={{ background: '#1e1e1e', border: '1.5px solid #333' }}>
            <span className="text-gray-500 text-sm mr-2">+256</span>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter your payment account"
              className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
          </div>
          <p className="text-xs mt-2" style={{ color: 'rgba(201,168,76,0.7)' }}>⚠ Fill in your account accurately — incorrect filling may result in loss of funds.</p>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <p className="text-[#c9a84c] text-xs font-medium mb-2 cursor-pointer">If the recharge is not entered for a long time, please click here</p>
          <div className="space-y-1.5 text-xs text-gray-500">
            <p>1. The minimum top-up amount is <strong className="text-[#c9a84c]">{formatUGX(MIN_DEPOSIT)}</strong> — this covers the entry-level <strong className="text-[#c9a84c]">VIP 1 Legend One BMW</strong> product.</p>
            <p>2. Use the latest account details for each transaction to avoid using outdated information.</p>
            <p>3. Carefully read the payment instructions and follow required procedures strictly.</p>
            <p>4. Allow 2–5 minutes after transfer before following up.</p>
            <p>5. If not credited promptly after transfer, contact official customer support for assistance.</p>
          </div>
        </div>

        <button onClick={handleConfirm} className="w-full py-4 rounded-2xl font-bold text-black gold-gradient flex items-center justify-center gap-2">
          Confirm
        </button>
      </div>
      <div className="h-6" />
    </div>
  );
}
