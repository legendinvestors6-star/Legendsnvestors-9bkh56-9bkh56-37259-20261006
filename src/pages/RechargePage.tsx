import { useCallback, useEffect, useRef, useState } from 'react';
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

function generateReference(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return `${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
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

function normalizeStatus(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function isSuccessfulStatus(status: string): boolean {
  return ['completed', 'approved', 'success', 'successful', 'paid'].includes(status);
}

function isFailedStatus(status: string): boolean {
  return ['rejected', 'failed', 'cancelled', 'canceled'].includes(status);
}

export default function RechargePage() {
  const navigate = useNavigate();
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttempts = useRef(0);
  const activeOrder = useRef<{ id: string; userId: string } | null>(null);

  const [amount, setAmount] = useState('30000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel');
  const [status, setStatus] = useState<RechargeStatus>('idle');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [orderId, setOrderId] = useState('');

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const refreshBalance = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Could not refresh wallet balance:', error.message);
      return;
    }

    if (!data) return;

    const balance = Number(data.balance || 0);
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
      // The database balance remains authoritative.
    }
  }, []);

  const pollOrderStatus = useCallback(
    async (id: string, userId: string) => {
      pollAttempts.current += 1;

      if (pollAttempts.current > MAX_POLL_ATTEMPTS) {
        setStatus('timeout');
        toast.error('Still waiting. Check Recharge Status before trying again.');
        return;
      }

      try {
        const { data: order, error } = await supabase
          .from('investment_packages')
          .select('status')
          .eq('id', id)
          .eq('user_id', userId)
          .eq('product_name', 'RECHARGE')
          .maybeSingle();

        if (error) {
          console.error('Could not check recharge status:', error.message);
        } else {
          const orderStatus = normalizeStatus(order?.status);

          if (isSuccessfulStatus(orderStatus)) {
            stopPolling();
            await refreshBalance(userId);
            setStatus('success');
            toast.success('Payment confirmed.');
            return;
          }

          if (isFailedStatus(orderStatus)) {
            stopPolling();
            setStatus('failed');
            toast.error('Payment was not completed.');
            return;
          }
        }
      } catch (error) {
        console.error('Recharge status check failed:', error);
      }

      pollTimer.current = setTimeout(() => {
        void pollOrderStatus(id, userId);
      }, POLL_INTERVAL_MS);
    },
    [refreshBalance, stopPolling]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem('legend_user');

      if (raw) {
        const user = JSON.parse(raw);
        setCurrentBalance(Number(user.balance) || 0);

        if (user.phone) {
          setPhone(String(user.phone));
        }
      }
    } catch {
      // Ignore invalid local session data.
    }

    return () => stopPolling();
  }, [stopPolling]);

  const handleRecharge = async () => {
    const rechargeAmount = Number(amount);
    const cleanPhone = phone.trim();

    if (
      !Number.isSafeInteger(rechargeAmount) ||
      rechargeAmount < MIN_AMOUNT ||
      rechargeAmount > MAX_AMOUNT
    ) {
      toast.error(
        `Enter an amount between UGX ${MIN_AMOUNT.toLocaleString()} and UGX ${MAX_AMOUNT.toLocaleString()}.`
      );
      return;
    }

    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 10) {
      toast.error('Enter a valid Uganda phone number.');
      return;
    }

    const userId = getCurrentUserId();

    if (!userId) {
      navigate('/login');
      return;
    }

    // The payment API requires a real Supabase Auth access token and verifies
    // that its authenticated user ID matches the requested user ID.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      toast.error(
        'This account is not signed in with Supabase Auth. Please sign in again.'
      );
      return;
    }

    if (session.user.id !== userId) {
      toast.error(
        'Your app account does not match your Supabase Auth account. Please sign in again.'
      );
      return;
    }

    stopPolling();
    pollAttempts.current = 0;

    const newOrderId = generateReference();
    activeOrder.current = { id: newOrderId, userId };
    setOrderId(newOrderId);
    setStatus('loading');

    try {
      const response = await fetch('/api/pesajet/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: rechargeAmount,
          phone: cleanPhone,
          provider,
          reference: newOrderId,
          user_id: userId,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success !== true) {
        // If the server returns the reference, the provider request may have
        // been accepted. Keep checking instead of encouraging a duplicate try.
        if (result?.reference === newOrderId) {
          setStatus('verifying');
          toast.info(
            'The payment request result is uncertain. Checking order status before retrying.'
          );
          void pollOrderStatus(newOrderId, userId);
          return;
        }

        throw new Error(
          result?.error ||
            result?.message ||
            `Payment request failed (${response.status}).`
        );
      }

      setStatus('verifying');
      toast.success('Payment request accepted. Check your phone for the PIN prompt.');
      void pollOrderStatus(newOrderId, userId);
    } catch (error) {
      console.error('Recharge request failed:', error);
      setStatus('failed');
      toast.error(
        error instanceof Error ? error.message : 'Could not start payment.'
      );
    }
  };

  const resetRecharge = () => {
    stopPolling();
    pollAttempts.current = 0;
    activeOrder.current = null;
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
          Current balance: UGX {currentBalance.toLocaleString()}
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

            <p className="text-white font-bold text-lg">Check Your Phone</p>
            <p className="text-[#c9a84c] font-black text-xl mt-2">
              UGX {Number(amount).toLocaleString()}
            </p>
            <p className="text-white text-sm mt-3">
              Payment request sent to {phone}.
            </p>
            <p className="text-yellow-400 text-xs mt-2 animate-pulse">
              Waiting for provider confirmation…
            </p>
            <p className="text-gray-500 text-xs mt-3">
              Enter your PIN only in the official MTN/Airtel prompt.
            </p>
            <p className="text-gray-600 text-[10px] mt-4 break-all">
              Reference: {orderId}
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
              type="button"
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
                ? 'The payment request failed or the provider reported it was not completed.'
                : 'No final confirmation yet. Check the order status before retrying.'}
            </p>

            {orderId && (
              <p className="text-gray-600 text-[10px] mt-3 break-all">
                Reference: {orderId}
              </p>
            )}

            <Link
              to="/recharge-status"
              className="mt-5 inline-block w-full py-3 rounded-xl font-bold text-black text-sm text-center"
              style={{ background: '#c9a84c' }}
            >
              View Status
            </Link>

            {status === 'timeout' && orderId && activeOrder.current && (
              <button
                type="button"
                onClick={() => {
                  pollAttempts.current = 0;
                  setStatus('verifying');
                  void pollOrderStatus(
                    activeOrder.current!.id,
                    activeOrder.current!.userId
                  );
                }}
                className="mt-3 w-full py-3 rounded-xl font-bold text-white text-sm"
                style={{ background: '#1f1f1f' }}
              >
                Check Again
              </button>
            )}

            <button
              type="button"
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
                  step="1"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
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
                      provider === 'mtn' ? 'rgba(201,168,76,0.15)' : '#1f1f1f',
                    border: `1.5px solid ${provider === 'mtn' ? '#c9a84c' : '#333'}`,
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
                    border: `1.5px solid ${provider === 'airtel' ? '#c9a84c' : '#333'}`,
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
                  onChange={event => setPhone(event.target.value)}
                  placeholder="07XXXXXXXX"
                  autoComplete="tel"
                  className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleRecharge()}
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
