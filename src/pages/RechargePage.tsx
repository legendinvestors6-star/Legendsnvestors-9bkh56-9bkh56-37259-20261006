import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('legend_user');
    if (raw) return JSON.parse(raw).id;
    return localStorage.getItem('legend_current_user') || localStorage.getItem('user_id');
  } catch { return null; }
}

export default function RechargeStatusPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const userId = getCurrentUserId();
      if (!userId) { setLoading(false); return; }
      
      const { data } = await supabase
        .from('recharge_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (data) setOrders(data);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="px-6 pt-14 pb-6 flex items-center justify-between">
        <h1 className="text-xl font-black text-white">My Recharges</h1>
        <Link to="/recharge" className="text-[#c9a84c] text-sm font-bold">+ New Recharge</Link>
      </div>

      <div className="mx-4 space-y-3">
        {loading ? <p className="text-gray-500 text-sm">Loading...</p> : 
         orders.length === 0 ? (
          <div className="text-center py-16 rounded-3xl" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <p className="text-gray-500 text-sm">No recharges yet</p>
            <Link to="/recharge" className="text-[#c9a84c] text-sm mt-3 inline-block font-bold">Recharge Now</Link>
          </div>
        ) : orders.map(order => (
          <div key={order.id} className="rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-bold text-sm">UGX {Number(order.amount).toLocaleString()}</p>
                <p className="text-gray-500 text-[11px] mt-1">{order.phone_number} • {order.payment_method?.toUpperCase()}</p>
                <p className="text-gray-600 text-[10px] mt-1">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                order.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                order.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>{order.status?.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="h-8" />
    </div>
  );
}
