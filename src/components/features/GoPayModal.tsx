import { useState, useEffect } from 'react';
import { X, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { MTN_ACCOUNT, MTN_NAME, AIRTEL_MERCHANT, AIRTEL_MERCHANT_NAME } from '@/constants/products';
import type { RechargeOrder } from '@/types';

interface Props {
  order: RechargeOrder;
  onClose: () => void;
  onConfirmPaid: (amount: number) => void;
}

export default function GoPayModal({ order, onClose, onConfirmPaid }: Props) {
  const [paidAmount, setPaidAmount] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedName, setCopiedName] = useState(false);
  const [copiedAirtel, setCopiedAirtel] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  const isMTN = order.paymentMethod === 'MTN';

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const mtnUssdCode = `*165*1*1*${MTN_ACCOUNT}*${order.amount}#`;
  const airtelUssdCode = `*185*9*${AIRTEL_MERCHANT}*${order.amount}#`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div className="w-full max-w-[480px] rounded-t-3xl p-5 pb-8 overflow-y-auto max-h-[90vh]"
        style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
              <span className="text-black font-black text-sm">GP</span>
            </div>
            <p className="text-[#c9a84c] font-black text-lg tracking-widest">GOPAY</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs">Transaction expires in</p>
            <div className="flex gap-1 mt-1">
              {[minutes[0], minutes[1], ':', seconds[0], seconds[1]].map((char, i) => (
                char === ':' ? (
                  <span key={i} className="text-[#c9a84c] font-bold text-lg">:</span>
                ) : (
                  <div key={i} className="w-7 h-7 rounded flex items-center justify-center font-bold text-sm"
                    style={{ background: '#1a1a1a', color: '#c9a84c', border: '1px solid #333' }}>
                    {char}
                  </div>
                )
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#2a2a2a' }}>
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* MTN Payment */}
        {isMTN && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#ffcc00' }}>
                <span className="text-black font-black text-[10px]">MTN</span>
              </div>
              <p className="text-white font-bold">COPY & PAY</p>
            </div>
            <p className="text-gray-400 text-xs mb-3">
              Copy this <span className="text-yellow-400 font-semibold">MTN</span> account and make payment via <strong className="text-[#c9a84c]">*185*1#</strong>
            </p>

            <div className="rounded-xl p-3 mb-1" style={{ background: '#0f0f0f' }}>
              <p className="text-gray-500 text-xs mb-1">Total Amount:</p>
              <p className="text-[#c9a84c] text-2xl font-black">UGX {order.amount.toLocaleString()}</p>
            </div>

            <div className="rounded-xl p-3 mb-1" style={{ background: '#0f0f0f' }}>
              <p className="text-gray-500 text-xs mb-1">MTN Account:</p>
              <div className="flex items-center justify-between">
                <p className="text-[#c9a84c] text-xl font-bold">{MTN_ACCOUNT}</p>
                <button onClick={() => copyToClipboard(MTN_ACCOUNT, setCopiedAccount)}
                  className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#2a2a2a' }}>
                  {copiedAccount ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
                </button>
              </div>
            </div>

            <div className="rounded-xl p-3 mb-3" style={{ background: '#0f0f0f' }}>
              <p className="text-gray-500 text-xs mb-1">Account Name:</p>
              <div className="flex items-center justify-between">
                <p className="text-[#c9a84c] text-xl font-bold">{MTN_NAME}</p>
                <button onClick={() => copyToClipboard(MTN_NAME, setCopiedName)}
                  className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#2a2a2a' }}>
                  {copiedName ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
                </button>
              </div>
            </div>

            {/* USSD Dial */}
            <div className="rounded-xl p-3 mb-1" style={{ background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.15)' }}>
              <p className="text-gray-500 text-xs mb-1">Dial to pay:</p>
              <p className="text-yellow-400 font-bold text-sm">*185*1#</p>
              <p className="text-gray-500 text-xs mt-0.5">Select Send Money → Enter account {MTN_ACCOUNT} → Amount {order.amount}</p>
            </div>

            <button onClick={() => copyToClipboard(mtnUssdCode, () => {})}
              className="w-full mt-3 py-3.5 rounded-xl font-bold text-black gold-gradient flex items-center justify-center gap-2">
              Click to pay {mtnUssdCode}
            </button>
            <button onClick={() => copyToClipboard(mtnUssdCode, () => {})}
              className="w-full mt-2 text-[#c9a84c] text-xs flex items-center justify-center gap-1">
              <Copy size={12} /> {mtnUssdCode}
            </button>
          </div>
        )}

        {/* AIRTEL Payment */}
        {!isMTN && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#ef3a3a' }}>
                <span className="text-white font-black text-[8px]">AIR</span>
              </div>
              <p className="text-white font-bold">AIRTEL PAYMENT</p>
            </div>
            <p className="text-gray-400 text-xs mb-3">
              Copy the merchant code and pay via <strong className="text-red-400">*185*9#</strong>
            </p>

            <div className="rounded-xl p-3 mb-1" style={{ background: '#0f0f0f' }}>
              <p className="text-gray-500 text-xs mb-1">Total Amount:</p>
              <p className="text-[#c9a84c] text-2xl font-black">UGX {order.amount.toLocaleString()}</p>
            </div>

            <div className="rounded-xl p-3 mb-1" style={{ background: '#0f0f0f' }}>
              <p className="text-gray-500 text-xs mb-1">Merchant Code:</p>
              <div className="flex items-center justify-between">
                <p className="text-[#c9a84c] text-xl font-bold">{AIRTEL_MERCHANT}</p>
                <button onClick={() => copyToClipboard(AIRTEL_MERCHANT, setCopiedAirtel)}
                  className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#2a2a2a' }}>
                  {copiedAirtel ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
                </button>
              </div>
            </div>

            <div className="rounded-xl p-3 mb-3" style={{ background: '#0f0f0f' }}>
              <p className="text-gray-500 text-xs mb-1">Merchant Name:</p>
              <p className="text-[#c9a84c] font-bold text-sm">{AIRTEL_MERCHANT_NAME}</p>
            </div>

            {/* Airtel USSD instructions */}
            <div className="rounded-xl p-3 mb-1" style={{ background: 'rgba(239,58,58,0.06)', border: '1px solid rgba(239,58,58,0.15)' }}>
              <p className="text-red-400 font-bold text-sm mb-1">How to pay via Airtel:</p>
              <div className="space-y-0.5 text-xs text-gray-400">
                <p>1. Dial <strong className="text-red-400">*185*9#</strong> on your Airtel phone</p>
                <p>2. Select <strong className="text-white">Pay Merchant</strong></p>
                <p>3. Enter merchant code: <strong className="text-[#c9a84c]">{AIRTEL_MERCHANT}</strong></p>
                <p>4. Enter amount: <strong className="text-[#c9a84c]">UGX {order.amount.toLocaleString()}</strong></p>
                <p>5. Confirm with your PIN</p>
              </div>
            </div>

            <button onClick={() => copyToClipboard(airtelUssdCode, () => {})}
              className="w-full mt-3 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }}>
              Dial {airtelUssdCode}
            </button>
          </div>
        )}

        {/* Confirm Paid */}
        <div className="rounded-2xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={16} className="text-[#c9a84c]" />
            <p className="text-white font-bold">Payment completed?</p>
          </div>
          <p className="text-gray-400 text-xs mb-3">
            Enter the amount paid and click <span className="text-[#c9a84c] font-semibold">"Confirm Paid"</span>
          </p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center rounded-xl px-3 py-2.5" style={{ background: '#0f0f0f', border: '1px solid #333' }}>
              <span className="text-gray-500 text-xs mr-2">UGX</span>
              <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                className="flex-1 bg-transparent outline-none text-white text-sm" placeholder="0" />
            </div>
            <button onClick={() => {
              const amt = parseInt(paidAmount);
              if (!amt || amt <= 0) { toast.error('Enter the amount you paid'); return; }
              onConfirmPaid(amt);
            }} className="px-4 py-2.5 rounded-xl font-bold text-black text-sm gold-gradient">
              Confirm Paid
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">After paying, submit your transaction for verification. Pending payments are never lost.</p>
        </div>
      </div>
    </div>
  );
}
