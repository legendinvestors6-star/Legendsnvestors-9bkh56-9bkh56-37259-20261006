import { useState, useEffect } from 'react';
import { ChevronLeft, ArrowDownToLine, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const formatUGX = (n: number) => `UGX ${Number(n||0).toLocaleString()}`;
const MIN_WITHDRAWAL = 9000;
const WITHDRAWAL_FEE_RATE = 0.16;

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) return JSON.parse(raw).id;
    return localStorage.getItem('legend_current_user');
  } catch { return null; }
}

function getCurrentUserData(): any {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function WithdrawPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [userProducts, setUserProducts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const rawUser = getCurrentUserData();
      const userId = getCurrentUserId();
      if (!userId) { navigate('/login'); return; }
      
      // Get fresh user from Supabase
      let user = rawUser;
      try {
        const { data } = await supabase.from('users').select('*').eq('id', userId).single();
        if (data) {
          user = { ...data, balance: Number(data.balance), bankCard: rawUser?.bankCard || data.bankCard || null, id: data.id };
        }
      } catch {}
      
      setCurrentUser(user || { id: userId, balance: 0, bankCard: rawUser?.bankCard });

      try {
        const { data: products } = await supabase.from('user_products').select('*').eq('user_id', userId);
        setUserProducts(products || []);
      } catch {
        const local = JSON.parse(localStorage.getItem('legend_user_products') || '[]');
        setUserProducts(local.filter((p: any) => p.userId === userId));
      }
    };
    load();
  }, [navigate]);

  if (!currentUser) return null;

  const hasActiveProduct = userProducts.some((p) => p.status === 'active');
  const numAmount = parseInt(amount) || 0;
  const fee = Math.floor(numAmount * WITHDRAWAL_FEE_RATE);
  const received = numAmount - fee;

  const handleWithdraw = async () => {
    if (!hasActiveProduct) {
      toast.error('You need at least one active product to withdraw');
      navigate('/product');
      return;
    }

    if (!currentUser.bankCard && !currentUser.bank_card) {
      toast.error('Please bind your bank card first');
      navigate('/bind-card');
      return;
    }

    if (numAmount < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ${formatUGX(MIN_WITHDRAWAL)}`);
      return;
    }

    if (numAmount > currentUser.balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      const orderId = Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
      
      // 1. Create withdraw order in Supabase so ADMIN CAN SEE IT!
      const { error: orderError } = await supabase.from('withdraw_orders').insert({
        id: orderId,
        user_id: currentUser.id,
        amount: numAmount,
        received_amount: received,
        fee: fee,
        bank_card: currentUser.bankCard || currentUser.bank_card,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      if (orderError) {
        console.log('order error', orderError);
        toast.error('Failed to submit: ' + orderError.message);
        return;
      }

      // 2. Deduct balance immediately
      const newBalance = currentUser.balance - numAmount;
      
      // Update Supabase users table
      await supabase.from('users').update({ balance: newBalance }).eq('id', currentUser.id);
      
      // Update localStorage legend_user too
      try {
        const raw = localStorage.getItem('legend_user');
        if (raw) {
          const u = JSON.parse(raw);
          u.balance = newBalance;
          localStorage.setItem('legend_user', JSON.stringify(u));
        }
      } catch {}

      // Also save to localStorage backup for WithdrawStatus page
      const localOrders = JSON.parse(localStorage.getItem('legend_withdraw_orders') || '[]');
      localOrders.unshift({
        id: orderId,
        userId: currentUser.id,
        amount: numAmount,
        receivedAmount: received,
        fee,
        bankCard: currentUser.bankCard,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('legend_withdraw_orders', JSON.stringify(localOrders));

      toast.success('Withdrawal submitted! Admin will see it now');
      navigate('/records');
    } catch (error: any) {
      toast.error(error?.message || 'Withdrawal failed');
    }
  };

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Withdrawal</h1>
        <button onClick={() => navigate('/withdraw-status')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c' }}>
          <Activity size={13} /> History
        </button>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <div className="mb-5">
            <p className="text-gray-500 text-sm">Current balance</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex flex-col gap-0.5">
                <div className="w-5 h-0.5 rounded-full" style={{background:'#c9a84c'}} />
                <div className="w-5 h-0.5 rounded-full" style={{background:'#c9a84c'}} />
                <div className="w-5 h-0.5 rounded-full" style={{background:'#c9a84c'}} />
              </div>
              <p className="text-3xl font-black text-white">{formatUGX(currentUser.balance)}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-gray-500 text-sm mb-2">Please select your bank card</p>
            <button onClick={() => navigate('/bind-card')} className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-colors" style={{ background: '#1e1e1e', border: '1.5px solid #333' }}>
              <div className="flex items-center gap-2 text-gray-500">
                <ArrowDownToLine size={16} className="text-[#c9a84c]" />
                {currentUser.bankCard ? (
                  <span className="text-gray-300 font-medium text-sm">{currentUser.bankCard.bank} - {currentUser.bankCard.accountNumber}</span>
                ) : (
                  <span className="text-gray-600 text-sm">______ - ____________</span>
                )}
              </div>
              <span className="text-gray-600">&gt;</span>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-gray-500 text-sm mb-2">Withdrawal amount</p>
            <div className="flex items-center rounded-xl px-4 py-3.5" style={{ background: '#1e1e1e', border: '1.5px solid #333' }}>
              <span className="text-[#c9a84c] font-bold mr-2">UGX</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Please enter withdrawal amount" className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600" />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Received: <strong className="text-white">{formatUGX(received > 0 ? received : 0)}</strong></span>
              <span>Fee: <strong className="text-white">{(WITHDRAWAL_FEE_RATE * 100).toFixed(0)}%</strong></span>
            </div>
          </div>

          <button onClick={handleWithdraw} className="w-full py-4 rounded-xl font-bold text-black text-base" style={{background:'#c9a84c'}}>Confirm</button>
        </div>

        <div className="rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <div className="space-y-2 text-sm text-gray-500">
            <p>1. The minimum withdrawal amount is <strong className="text-[#c9a84c]">{formatUGX(MIN_WITHDRAWAL)}</strong></p>
            <p>2. The withdrawal fee is {(WITHDRAWAL_FEE_RATE * 100).toFixed(0)}% of the withdrawal amount.</p>
            <p>3. You can make a withdrawal at any time; funds will be credited within 4 to 24 hours.</p>
            <p>4. You must have at least one <strong className="text-[#c9a84c]">active product</strong> to enable the withdrawal function.</p>
          </div>
        </div>
      </div>
    </div>
  );
          }
