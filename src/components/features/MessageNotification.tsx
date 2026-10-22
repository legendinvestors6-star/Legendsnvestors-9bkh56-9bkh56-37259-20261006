import { Bell, X } from 'lucide-react';
import { TELEGRAM_LINK } from '@/constants/products';

interface Props {
  onClose: () => void;
}

const messages = [
  '1. Registration Reward: 9,000 UGX',
  '2. Daily Check-in Reward: 300 UGX',
  '3. Daily return rate of 27%-45%, recover all funds in 2-3 days and continue to profit.',
  '4. Invite others to invest and immediately receive a cash reward equal to 40% of their investment amount.',
  '5. Product earnings are automatically credited to your account every 24 hours and can be withdrawn at any time.',
  '6. Legend will be launched in Uganda on November 01, 2026.',
  '7. Join the Telegram group to learn more about making money.',
];

export default function MessageNotification({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.3)' }}>
        {/* Header */}
        <div className="p-5 pb-3" style={{ background: 'rgba(201,168,76,0.08)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gold-gradient rounded-xl flex items-center justify-center">
                <Bell size={20} className="text-black" />
              </div>
              <div>
                <h3 className="text-white font-black text-xl">Message</h3>
                <h3 className="text-white font-black text-xl">Notification</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 gold-gradient rounded-full flex items-center justify-center"
            >
              <X size={16} className="text-black" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="p-5 pt-3 space-y-3">
          {messages.map((msg, i) => (
            <p key={i} className="text-gray-300 text-sm leading-relaxed">{msg}</p>
          ))}

          <a
            href={TELEGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mt-3 pt-3 border-t"
            style={{ borderColor: 'rgba(201,168,76,0.2)' }}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#0088cc' }}>
              <span className="text-white text-xs font-bold">t</span>
            </div>
            <span className="text-[#c9a84c] text-sm">Click to jump to the official Telegram channel &gt;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
