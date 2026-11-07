import { useCallback, useEffect, useState } from 'react';
import { DollarSign, Phone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { formatUGX } from '@/lib/storage';

type RechargeOrder = {
  id: string;
  user_id: string | null;
  amount: number | string;
  phone_number: string | null;
  payment_method: string | null;
  status: string | null;
  submitted_at: string | null;
  created_at: string | null;
  pesajet_id: string | null;
};

function statusStyle(statusValue: string | null) {
  const status = String(statusValue || 'unknown').toLowerCase();

  if (['completed', 'approved', 'paid', 'successful'].includes(status)) {
    return {
      label: 'COMPLETED',
      color: '#4ade80',
      background: 'rgba(74,222,128,0.12)',
    };
  }

  if (status === 'pending') {
    return {
      label: 'PENDING',
      color: '#fbbf24',
      background: 'rgba(251,191,36,0.15)',
    };
  }

  return {
    label: status.toUpperCase(),
    color: '#f87171',
    background: 'rgba(248,113,113,0.12)',
  };
}

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export default function PesaJetTab() {
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    const { data, error } = await supabase
      .from('investment_packages')
      .select(
        'id, user_id, amount, phone_number, payment_method, status, submitted_at, created_at, pesajet_id'
      )
      .eq('product_name', 'RECHARGE')
      .order('submitted_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Could not load PesaJet recharge orders:', error.message);
      setLoadError(
        'Could not load recharge records. Check Supabase access policies and table columns.'
      );
      setLoading(false);
      return;
    }

    setOrders((data || []) as RechargeOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [load]);

  const pendingOrders = orders.filter(
    order => String(order.status).toLowerCase() === 'pending'
  );

  const completedOrders = orders.filter(order =>
    ['completed', 'approved', 'paid', 'successful'].includes(
      String(order.status).toLowerCase()
    )
  );

  const pendingAmount = pendingOrders.reduce(
    (sum, order) => sum + Number(order.amount || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, #1a1100 0%, #2d1f00 100%)',
          border: '1px solid rgba(201,168,76,0.4)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
            }}
          >
            <DollarSign size={22} className="text-black" />
          </div>
          <div>
            <p className="text-white font-black text-base">
              PesaJet Recharge Monitor
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Payment status is updated by the verified server callback.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <p className="text-[#fbbf24] font-black text-xl">
              {pendingOrders.length}
            </p>
            <p className="text-gray-500 text-[10px]">Pending</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <p className="text-white font-black text-sm">
              {formatUGX(pendingAmount)}
            </p>
            <p className="text-gray-500 text-[10px]">Pending amount</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <p className="text-green-400 font-black text-xl">
              {completedOrders.length}
            </p>
            <p className="text-gray-500 text-[10px]">Completed</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void load()}
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-black text-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #c9a84c, #f0c040)',
        }}
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Checking…' : 'Refresh PesaJet records'}
      </button>

      {loadError && (
        <div className="rounded-xl p-3 text-sm text-red-300 bg-red-950/30">
          {loadError}
        </div>
      )}

      {!loadError && !loading && orders.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: '#111', border: '1px dashed #333' }}
        >
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
            style={{ background: 'rgba(201,168,76,0.1)' }}
          >
            <DollarSign size={24} className="text-[#c9a84c]" />
          </div>
          <p className="text-white font-bold">No recharge records</p>
          <p className="text-gray-500 text-xs mt-1">
            New records appear after the payment API creates them in the database.
          </p>
        </div>
      )}

      {orders.map(order => {
        const status = statusStyle(order.status);
        const paymentMethod = String(order.payment_method || 'PesaJet').toUpperCase();

        return (
          <article
            key={order.id}
            className="rounded-2xl p-4"
            style={{
              background: '#111',
              border: '1px solid rgba(201,168,76,0.3)',
            }}
          >
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-black text-lg">
                    {formatUGX(Number(order.amount || 0))}
                  </p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-white/5 text-gray-300">
                    {paymentMethod}
                  </span>
                </div>

                <p className="text-gray-300 text-xs mt-2 flex items-center gap-1">
                  <Phone size={12} />
                  {order.phone_number || 'Phone unavailable'}
                </p>

                <p className="text-gray-500 text-[10px] mt-1 break-all">
                  Reference: {order.id}
                </p>

                {order.pesajet_id && (
                  <p className="text-gray-500 text-[10px] mt-1 break-all">
                    Provider transaction: {order.pesajet_id}
                  </p>
                )}

                <p className="text-gray-500 text-[10px] mt-1">
                  User: {order.user_id || 'Unavailable'}
                </p>
              </div>

              <span
                className="text-[10px] px-2 py-1 rounded-full font-bold h-fit shrink-0"
                style={{
                  background: status.background,
                  color: status.color,
                }}
              >
                {status.label}
              </span>
            </div>

            <p className="text-gray-600 text-[10px] mt-3">
              {formatDate(order.submitted_at || order.created_at)}
            </p>
          </article>
        );
      })}
    </div>
  );
            }
