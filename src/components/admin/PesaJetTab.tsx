import { useState, useEffect } from 'react';
import { DollarSign, Check, X, Phone, RefreshCw } from 'lucide-react';
import { getRechargeOrders, approveRechargeOrder, rejectRechargeOrder, formatUGX } from '@/lib/storage';
import { toast } from 'sonner';

export default function PesaJetTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const pending = getRechargeOrders().filter((o:any) => o.status === 'pending');
    setOrders(pending);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleConfirm = (id: string, amount: number, phone: string) => {
    if (!confirm(`PESAJET CONFIRM:\n\nReceived UGX ${amount.toLocaleString()} from +256 ${phone} on MTN 0756406186 (Nabakooza Milly)?\n\nApprove?`)) return;
    approveRechargeOrder(id);
    toast.success(`✅ PesaJet Confirmed! ${formatUGX(amount)} credited!`);
    load();
  };

  const totalPending = orders.reduce((s:number,o:any) => s + Number(o.amount||0), 0);

  return (
    <div className="space-y-4">
      {/* PesaJet Header - Gold & Black */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #1a1100 0%, #2d1f00 100%)', border: '1px solid rgba(201,168,76,0.4)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
            <DollarSign size={22} className="text-black" />
          </div>
          <div>
            <p className="text-white font-black text-base">PesaJet Pay - MTN MoMo & Airtel</p>
            <p className="text-[#c9a84c] text-xs">Verify on MTN 0756406186 • Auto credit</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <p className="text-[#c9a84c] font-black text-xl">{orders.length}</p>
            <p className="text-gray-500 text-[10px]">Pending Orders</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <p className="text-white font-black text-sm">{formatUGX(totalPending)}</p>
            <p className="text-gray-500 text-[10px]">Total UGX</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <p className="text-green-400 font-black text-xs">MTN • Airtel</p>
            <p className="text-gray-500 text-[10px]">Uganda</p>
          </div>
        </div>
      </div>

      <button onClick={load} className="w-full py-3.5 rounded-xl font-black text-black text-sm flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Checking...' : `Refresh PesaJet (${orders.length} pending)`}
      </button>

      {orders.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: '#111111', border: '1px dashed #333' }}>
          <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(201,168,76,0.1)' }}>
            <DollarSign size={24} className="text-[#c9a84c]" />
          </div>
          <p className="text-white font-bold">No pending PesaJet payments</p>
          <p className="text-gray-500 text-xs mt-1">When user pays via MTN/Airtel, it appears here automatically</p>
        </div>
      ) : (
        orders.map((o:any) => (
          <div key={o.id} className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid rgba(201,168,76,0.3)' }}>
            <div className="flex justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-black text-lg">{formatUGX(o.amount)}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${o.paymentMethod === 'MTN' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-red-500/20 text-red-400'}`}>
                    {o.paymentMethod === 'MTN' ? 'MTN MoMo' : 'Airtel Money'}
                  </span>
                </div>
                <p className="text-gray-300 text-xs mt-1 flex items-center gap-1"><Phone size={12}/> Sender: +256 {o.phoneNumber}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">Order: {o.id.slice(0,12)}... • {new Date(o.createdAt).toLocaleTimeString()}</p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full font-bold h-fit" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>PENDING</span>
            </div>

            <div className="rounded-xl p-3 mb-3 space-y-2" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Amount to verify</span><span className="text-[#c9a84c] font-black">{formatUGX(o.amount)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Your MTN account</span><span className="text-white font-semibold">0756406186 (Nabakooza Milly)</span></div>
              <div className="rounded-lg p-2 mt-2" style={{ background: 'rgba(201,168,76,0.08)' }}>
                <p className="text-[#c9a84c] text-[10px] font-bold">📱 Verify: Dial *185*1# → Check MTN balance → Look for UGX {o.amount} from {o.phoneNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleConfirm(o.id, o.amount, o.phoneNumber)} className="py-3.5 rounded-xl text-xs font-black text-black flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
                <Check size={14}/> Confirm Received
              </button>
              <button onClick={() => { if(confirm('Reject this order?')) { rejectRechargeOrder(o.id); toast.success('Rejected'); load(); } }} className="py-3.5 rounded-xl text-xs font-bold text-red-400 flex items-center justify-center gap-1" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <X size={14}/> Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
                                                                                                                     }
