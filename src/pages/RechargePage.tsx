import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Phone, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type RechargeStatus =
  | 'idle'
  | 'loading'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'timeout';

const MIN_AMOUNT = 30000;
const MAX_AMOUNT = 1500000;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40;

function formatId(): string {
  return (
    Math.random().toString(36).slice(2, 11) +
    Date.now().toString(36)
  );
}

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('legend_user');

    if (raw) {
      const user = JSON.parse(raw);
      if (user?.id) return String(user.id);
    }

    return (
      localStorage.getItem('legend_current_user') ||
      localStorage.getItem('user_id')
    );
  } catch {
    return null;
  }
}

export default function RechargePage() {
  const navigate = useNavigate();
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttempts = useRef(0);

  const [amount, setAmount] = useState('30000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel');
  const [status, setStatus] = useState<RechargeStatus>('idle');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('legend_user');

      if (raw) {
        const user = JSON.parse(raw);
        setCurrentBalance(Number(user.balance) || 0);
        if (user.phone) setPhone(String(user.phone));
      }
    } catch {
      // Ignore malformed local profile data.
    }

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const refreshBalance = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Could not refresh wallet balance:', error);
      return;
    }

    if (!data) return;

    const balance = Number(data.balance) || 0;
    setCurrentBalance(balance);

    try {
      const raw = localStorage.getItem('legend_user');
      if (raw) {
        const user = JSON.parse(raw);
        if (String(user.id) === userId) {
          user.balance = balance;
          localStorage.setItem('legend_user', JSON.stringify(user));
        }
      }
    } catch {
      // The database remains the source of truth.
    }
  };

  const pollOrderStatus = async (id: string, userId: string) => {
    pollAttempts.current += 1;

    if (pollAttempts.current > MAX_POLL_ATTEMPTS) {
      setStatus('timeout');
      toast.error('Still waiting for payment confirmation. Check Recharge Status.');
      return;
    }

    const { data: order, error } = await supabase
      .from('recharge_orders')
      .select('status')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Recharge status check failed:', error);
      pollTimer.current = setTimeout(
        () => void pollOrderStatus(id, userId),
        POLL_INTERVAL_MS
      );
      return;
    }

    if (!order) {
      console.error('Recharge order was not found or is not accessible.');
      pollTimer.current = setTimeout(
        () => void pollOrderStatus(id, userId),
        POLL_INTERVAL_MS
      );
      return;
    }

    const orderStatus = String(order.status).toLowerCase();

    if (orderStatus === 'approved' || orderStatus === 'completed') {
      stopPolling();
      await refreshBalance(userId);
      setStatus('success');
      toast.success('Payment confirmed.');
      return;
    }

    if (
      orderStatus === 'rejected' ||
      orderStatus === 'failed' ||
      orderStatus === 'cancelled' ||
      orderStatus === 'canceled'
    ) {
      stopPolling();
      setStatus('failed');
      toast.error('Payment was not completed. You can check Recharge Status.');
      return;
    }

    pollTimer.current = setTimeout(
      () => void pollOrderStatus(id, userId),
      POLL_INTERVAL_MS
    );
  };

  const handleRecharge = async () => {
    const rechargeAmount = Number(amount);
    const cleanPhone = phone.trim();

    if (
      !Number.isFinite(rechargeAmount) ||
      rechargeAmount < MIN_AMOUNT ||
      rechargeAmount > MAX_AMOUNT
    ) {
      toast.error(
        `Enter an amount between UGX ${MIN_AMOUNT.toLocaleString()} and UGX ${MAX_AMOUNT.toLocaleString()}`
      );
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Enter a valid phone number, for example 07XXXXXXXX');
      return;
    }

    const userId = getCurrentUserId();

    if (!userId) {
      navigate('/login');
      return;
    }

    stopPolling();
    pollAttempts.current = 0;

    const newOrderId = formatId();
    setOrderId(newOrderId);
    setStatus('loading');

    try {
      const { error: orderError } = await supabase
        .from('recharge_orders')
        .insert({
          id: newOrderId,
          user_id: userId,
          phone: cleanPhone,
          phone_number: cleanPhone,
          amount: rechargeAmount,
          payment_method: provider,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (orderError) {
        throw new Error(`Could not create recharge order: ${orderError.message}`);
      }

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: rechargeAmount,
          phone: cleanPhone,
          provider,
          reference: newOrderId,
          user_id: userId,
        }),
      });

      const result = await response.json().catch(() => null);
      console.log('Payment API response:', response.status, result);

      const acceptedStatus = ['accepted', 'pending', 'initiated'].includes(
        String(result?.status || '').toLowerCase()
      );

      if (
        !response.ok ||
        (result?.success !== true && !acceptedStatus)
      ) {
        throw new Error(
          result?.error ||
            result?.message ||
            `Payment request failed (${response.status})`
        );
      }

      setStatus('verifying');
      toast.success(
        'Payment request accepted. Check your phone for the provider prompt.'
      );

      void pollOrderStatus(newOrderId, userId);
    } catch (error) {
      console.error('Recharge request failed:', error);

      // Do not display a success/prompt message if the request failed.
      setStatus('idle');
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not start the mobile-money payment'
      );
    }
  };

  const resetRecharge = () => {
    stopPolling();
    setOrderId('');
    setStatus('idle');
  };

  return (
    <div
      className="app-container min-h-screen pb-20"
      style={{ background: '#0a0a0a' }}
    >
      <div className="px-6 pt-14 pb-6 text-center">
        <h1 className="text-2xl font-black text-[#c9a84c]">
          Recharge Account
        </h1>
        <p className="text-gray-500 text-xs mt-2">
          Current: UGX {currentBalance.toLocaleString()}
        </p>
      </div>

      <div
        className="mx-4 rounded-3xl p-6"
        style={{ background: '#151515', border: '1px solid #2a2a2a' }}
      >
        {status === 'verifying' ? (
          <div className="text-center py-8">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 text-3xl animate-pulse"
              style={{ background: '#facc15' }}
            >
              📲
            </div>
            <p className="text-white font-bold text-lg">
              Check Your Phone
            </p>
            <p className="text-[#c9a84c] font-black text-xl mt-2">
              UGX {Number(amount).toLocaleString()}
            </p>
            <p className="text-white text-sm mt-3">
              Payment request accepted for {phone}.
            </p>
            <p className="text-yellow-400 text-xs mt-2 animate-pulse">
              Waiting for the provider to confirm payment…
            </p>
            <p className="text-gray-500 text-xs mt-3">
              Enter your PIN only in the official MTN/Airtel prompt. This app
              will never ask for your PIN.
            </p>
            <p className="text-gray-600 text-[10px] mt-4">
              Order: {orderId.slice(0, 12)} • {provider.toUpperCase()}
            </p>
            <Link
              to="/recharge-status"
              className="mt-4 inline-block w-full py-3 rounded-xl font-bold text-black text-sm text-center"
              style={{ background: '#c9a84c' }}
            >
              View Status
            </Link>
          </div>
        ) : status === 'success' ? (
          <div className="text-center py-8">
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 text-xl"
              style={{ background: '#22c55e' }}
            >
              ✓
            </div>
            <p className="text-white font-bold">Payment Confirmed</p>
            <p className="text-[#c9a84c] font-black text-lg mt-2">
              UGX {Number(amount).toLocaleString()}
            </p>
            <p className="text-gray-500 text-sm">
              Current balance: UGX {currentBalance.toLocaleString()}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Link
                to="/product"
                className="py-3 rounded-xl font-bold text-black text-sm text-center"
                style={{ background: '#c9a84c' }}
              >
                Buy Product →
              </Link>
              <Link
                to="/recharge-status"
                className="py-3 rounded-xl font-bold text-white text-sm text-center"
                style={{ background: '#1f1f1f', border: '1px solid #333' }}
              >
                Status
              </Link>
            </div>
            <button
              onClick={resetRecharge}
              className="mt-3 w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: '#1f1f1f' }}
            >
              Recharge Again
            </button>
          </div>
        ) : status === 'failed' || status === 'timeout' ? (
          <div className="text-center py-8">
            <p className="text-white font-bold text-lg">
              {status === 'failed' ? 'Payment Not Completed' : 'Still Waiting'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {status === 'failed'
                ? 'The provider did not confirm this payment.'
                : 'We have not received confirmation yet. Check the order status before trying again.'}
            </p>
            <Link
              to="/recharge-status"
              className="mt-5 inline-block w-full py-3 rounded-xl font-bold text-black text-sm text-center"
              style={{ background: '#c9a84c' }}
            >
              View Status
            </Link>
            <button
              onClick={resetRecharge}
              className="mt-3 w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: '#1f1f1f' }}
            >
              Back
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="rounded-xl p-3 flex justify-between"
              style={{ background: '#1f1f1f', border: '1px solid #333' }}
            >
              <span className="text-gray-500 text-xs">Current Wallet</span>
              <span className="text-[#c9a84c] font-bold text-sm">
                UGX {currentBalance.toLocaleString()}
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Amount (UGX)
              </label>
              <div
                className="flex items-center rounded-xl px-3 py-3.5"
                style={{ background: '#1f1f1f', border: '1.5px solid #333' }}
              >
                <Wallet size={15} className="text-gray-500 mr-2" />
                <input
                  type="number"
                  min={MIN_AMOUNT}
                  max={MAX_AMOUNT}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="30000"
                  className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600"
                />
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                Min UGX {MIN_AMOUNT.toLocaleString()} • Max UGX{' '}
                {MAX_AMOUNT.toLocaleString()}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProvider('mtn')}
                  className="py-3.5 rounded-xl text-sm font-bold"
                  style={{
                    background:
                      provider === 'mtn'
                        ? 'rgba(201,168,76,0.15)'
                        : '#1f1f1f',
                    border: `1.5px solid ${
                      provider === 'mtn' ? '#c9a84c' : '#333'
                    }`,
                    color: provider === 'mtn' ? '#c9a84c' : 'white',
                  }}
                >
                  MTN
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('airtel')}
                  className="py-3.5 rounded-xl text-sm font-bold"
                  style={{
                    background:
                      provider === 'airtel'
                        ? 'rgba(201,168,76,0.15)'
                        : '#1f1f1f',
                    border: `1.5px solid ${
                      provider === 'airtel' ? '#c9a84c' : '#333'
                    }`,
                    color: provider === 'airtel' ? '#c9a84c' : 'white',
                  }}
                >
                  Airtel Uganda
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Phone Number
              </label>
              <div
                className="flex items-center rounded-xl px-3 py-3.5"
                style={{ background: '#1f1f1f', border: '1.5px solid #333' }}
              >
                <Phone size={15} className="text-gray-500 mr-2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="07XXXXXXXX"
                  autoComplete="tel"
                  className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleRecharge}
              disabled={status === 'loading'}
              className="w-full py-4 rounded-xl font-bold text-black text-base mt-2 disabled:opacity-60"
              style={{ background: '#c9a84c' }}
            >
              {status === 'loading'
                ? 'Requesting Payment…'
                : `Recharge UGX ${Number(amount || 0).toLocaleString()}`}
            </button>

            <p className="text-center text-gray-500 text-[11px]">
              Wallet credit requires confirmation from the payment provider.
            </p>
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
      }
