import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Phone, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

const formatId = () =>
  Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) return JSON.parse(raw).id;
    return (
      localStorage.getItem('legend_current_user') ||
      localStorage.getItem('user_id')
    );
  } catch {
    return null;
  }
}

// FIX: 077... -> 25677... for PesaJet / MTN / Airtel
function formatPhone256(p: string): string {
  let s = String(p || '').trim().replace(/\s+/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0')) s = '256' + s.slice(1);
  return s;
}
function formatPhone07(p: string): string {
  let s = String(p || '').trim().replace(/\s+/g, '');
  if (s.startsWith('+256')) return '0' + s.slice(4);
  if (s.startsWith('256')) return '0' + s.slice(3);
  return s;
}

export default function RechargePage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('30000');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel');
  const [status, setStatus] =
    useState<'idle' | 'loading' | 'verifying' | 'success'>('idle');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [orderId, setOrderId] = useState('');
  const pollingRef = useRef<any>(null);

  // FIX: Load REAL balance from Supabase, not stale localStorage 9000
  useEffect(() => {
    const load = async () => {
      try {
        const raw = localStorage.getItem('legend_user');
        if (!raw) return;
        const u = JSON.parse(raw);
        if (u.phone) setPhone(u.phone);
        // Try Supabase first
        const { data } = await supabase.from('users').select('balance').eq('id', u.id).maybeSingle();
        if (data) {
          setCurrentBalance(Number((data as any).balance || 0));
          u.balance = Number((data as any).balance || 0);
          localStorage.setItem('legend_user', JSON.stringify(u));
        } else {
          setCurrentBalance(Number(u.balance || 0));
        }
      } catch {}
    };
    load();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const handleRecharge = async () => {
    if (!amount || Number(amount) < 1000) {
      toast.error('Enter valid amount');
      return;
    }
    if (Number(amount) < 1000 || Number(amount) > 1500000) {
      toast.error('Min UGX 1,000 • Max 1,500,000');
      return;
    }

    if (!phone || phone.length < 10) {
      toast.error('Enter phone 07XXXXXXXX');
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }

    const rechargeAmount = Number(amount);
    const newOrderId = formatId();
    setOrderId(newOrderId);
    setStatus('loading');

    try {
      // FIX: Do NOT insert order here - let /api/payments/create do it.
      // Double-insert was causing duplicate / conflict.
      // We only call the API which creates order + calls PesaJet.

      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: rechargeAmount,
          phone: formatPhone256(phone), // FIX: Send 256...
          phone_number: formatPhone256(phone),
          provider,
          reference: newOrderId,
          order_id: newOrderId,
          user_id: String(userId),
          userId: String(userId),
        }),
      });

      const data = await res.json().catch(() => null);
      console.log('Payment API response:', res.status, data);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Payment API failed (${res.status}) - PIN NOT SENT! Check Vercel Logs / PESAJET_API_KEY`
        );
      }

      if (data?.success === false) {
        throw new Error(
          data?.error || data?.message || 'Payment provider rejected the request - PIN NOT SENT!'
        );
      }

      // SUCCESS = PesaJet accepted = PIN is now on its way!
      setStatus('verifying');
      toast.success('PIN sent! Check your phone for the prompt.');
      startAutoCreditPolling(newOrderId, String(userId), rechargeAmount);
    } catch (error: any) {
      console.error('Recharge request failed:', error);
      setStatus('idle');
      toast.error(error?.message || 'Could not start the mobile-money payment');
    }
  };

  const startAutoCreditPolling = (oid: string, uid: string, amt: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      if (attempts > 60) { // 60 x 3s = 3 mins
        clearInterval(interval);
        pollingRef.current = null;
        toast.error('Waiting timeout - Check Recharge Status');
        setStatus('idle');
        return;
      }

      const { data: order, error } = await supabase
        .from('recharge_orders')
        .select('status')
        .eq('id', oid)
        .maybeSingle();

      if (error) {
        console.error('Recharge order polling error:', error);
        return;
      }

      // FIX: Accept approved / completed / success / paid - PesaJet uses different words!
      const st = String(order?.status || '').toLowerCase();
      if (st === 'approved' || st === 'completed' || st === 'success' || st === 'paid') {
        clearInterval(interval);
        pollingRef.current = null;

        try {
          // FIX: DO NOT add amt manually here!
          // Backend callback already added it. Just fetch FRESH balance.
          // Old code did balance + amt again = DOUBLE CREDIT!
          const { data: fresh } = await supabase
            .from('users')
            .select('balance')
            .eq('id', uid)
            .maybeSingle();

          let newBal = amt;
          if (fresh) {
            newBal = Number((fresh as any).balance || 0);
          } else {
            // Fallback: try by phone
            const { data: byPhone } = await supabase
              .from('users')
              .select('balance')
              .eq('phone', formatPhone07(phone))
              .maybeSingle();
            if (byPhone) newBal = Number((byPhone as any).balance || 0);
          }

          try {
            const raw = localStorage.getItem('legend_user');
            if (raw) {
              const u = JSON.parse(raw);
              u.balance = newBal;
              localStorage.setItem('legend_user', JSON.stringify(u));
              setCurrentBalance(newBal);
            }
          } catch {}

          setStatus('success');
          toast.success(`Success! UGX ${amt.toLocaleString()} credited!`);
        } catch (err) {
          console.error('Wallet sync failed:', err);
          setStatus('idle');
          toast.error('Recharge completed but wallet sync failed. Check balance / contact support.');
        }
      }

      // If failed, stop polling
      if (st === 'failed' || st === 'rejected' || st === 'cancelled') {
        clearInterval(interval);
        pollingRef.current = null;
        setStatus('idle');
        toast.error('Payment failed / cancelled. No money was removed.');
      }
    }, 3000);
    pollingRef.current = interval;
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
            <p className="text-white font-bold text-lg">Check Your Phone!</p>
            <p className="text-[#c9a84c] font-black text-xl mt-2">
              UGX {Number(amount).toLocaleString()}
            </p>
            <p className="text-white text-sm mt-3">
              PIN prompt sent to {phone}
            </p>
            <p className="text-yellow-400 text-xs mt-2 animate-pulse">
              Waiting for PIN... Wallet will auto-credit after PIN!
            </p>
            <div
              className="mt-5 p-3 rounded-xl text-left"
              style={{ background: '#1f1f1f' }}
            >
              <p className="text-gray-300 text-xs font-bold">
                How to complete:
              </p>
              <p className="text-gray-400 text-[11px] mt-1">
                1. You will get: "Pay UGX {amount} to LEGEND"
              </p>
              <p className="text-gray-400 text-[11px]">
                2. Enter your Mobile Money PIN
              </p>
              <p className="text-gray-400 text-[11px]">
                3. Money removed from {phone}
              </p>
              <p className="text-green-400 text-[11px] font-bold">
                4. Wallet auto-credited instantly!
              </p>
            </div>
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
            <p className="text-white font-bold">Payment Success!</p>
            <p className="text-[#c9a84c] font-black text-lg mt-2">
              UGX {Number(amount).toLocaleString()} Credited!
            </p>
            <p className="text-gray-500 text-sm">
              New Balance: UGX {currentBalance.toLocaleString()}
            </p>
            <p className="text-green-400 text-xs mt-2">
              Money removed from {phone} ✓
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
              onClick={() => setStatus('idle')}
              className="mt-3 w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: '#1f1f1f' }}
            >
              Recharge Again
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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600"
                />
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                Min UGX 1,000 • Max 1,500,000
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProvider('mtn')}
                  className="py-3.5 rounded-xl text-sm font-bold"
                  style={{
                    background:
                      provider === 'mtn' ? 'rgba(201,168,76,0.15)' : '#1f1f1f',
                    border: `1.5px solid ${
                      provider === 'mtn' ? '#c9a84c' : '#333'
                    }`,
                    color: provider === 'mtn' ? '#c9a84c' : 'white',
                  }}
                >
                  MTN
                </button>

                <button
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
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="flex-1 outline-none text-sm text-white bg-transparent placeholder-gray-600"
                />
              </div>
            </div>

            <button
              onClick={handleRecharge}
              disabled={status === 'loading'}
              className="w-full py-4 rounded-xl font-bold text-black text-base mt-2 disabled:opacity-60"
              style={{ background: '#c9a84c' }}
            >
              {status === 'loading'
                ? 'Sending PIN...'
                : `Recharge UGX ${Number(amount || 0).toLocaleString()} - Get PIN`}
            </button>

            <p className="text-center text-green-500 text-[11px]">
              ✓ Auto-credit after PIN - Money removed & wallet credited
            </p>
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  );
    }
