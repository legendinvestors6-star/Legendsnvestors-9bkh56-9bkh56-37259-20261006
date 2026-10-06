import { ChevronLeft, MessageCircle, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TELEGRAM_LINK, CUSTOMER_SERVICE } from '@/constants/products';

export default function CustomerServicePage() {
  const navigate = useNavigate();

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="w-4 h-0.5 gold-gradient rounded-full" />
            <div className="w-4 h-0.5 gold-gradient rounded-full" />
            <div className="w-4 h-0.5 gold-gradient rounded-full" />
          </div>
          <h1 className="text-white font-bold text-lg">Customer Service</h1>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid rgba(201,168,76,0.2)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center">
              <MessageCircle size={22} className="text-black" />
            </div>
            <div>
              <p className="text-white font-bold">Legend Support</p>
              <p className="text-[#c9a84c] text-xs">Online time: 9:00 - 20:00</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            For any questions about our platform, please contact our online customer service. They will answer all your questions.
          </p>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            If our online customer service does not reply to your message immediately, please wait patiently — every message is answered.
          </p>
        </div>

        <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer"
          className="block rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#0088cc' }}>
              <span className="text-white text-xl font-bold">✈</span>
            </div>
            <div>
              <p className="text-white font-bold">Official Telegram</p>
              <p className="text-[#c9a84c] text-xs">Click to join our Telegram group</p>
            </div>
          </div>
        </a>

        <a href={`https://wa.me/${CUSTOMER_SERVICE.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
          className="block rounded-2xl p-5 transition-opacity hover:opacity-90" style={{ background: '#151515', border: '1px solid rgba(37,211,102,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#25d366' }}>
              <Phone size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold">WhatsApp Support</p>
              <p className="text-[#25d366] text-sm font-semibold mt-0.5">{CUSTOMER_SERVICE}</p>
              <p className="text-gray-500 text-xs">Tap to chat on WhatsApp</p>
            </div>
          </div>
        </a>

        <div className="rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-red-400 text-sm font-semibold mb-2">⚠ Security Notice</p>
          <p className="text-gray-500 text-sm">Never share your password with anyone. Official staff will <strong className="text-red-400">never</strong> ask for your password.</p>
          <p className="text-gray-500 text-sm mt-2">If you cannot open the official Telegram app, please try using a different browser.</p>
        </div>
      </div>
    </div>
  );
}
