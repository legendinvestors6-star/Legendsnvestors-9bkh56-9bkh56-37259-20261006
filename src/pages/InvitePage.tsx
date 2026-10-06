import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Copy, Check, Share2, Users, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCurrentUser, getTeamMembers, getTeamCommissions, formatUGX } from '@/lib/storage';
import { TELEGRAM_LINK } from '@/constants/products';

export default function InvitePage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [copied, setCopied] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);
  const qrRef = useRef<HTMLImageElement>(null);

  if (!currentUser) { navigate('/'); return null; }

  const { level1, level2, level3 } = getTeamMembers(currentUser.id);
  const commissions = getTeamCommissions(currentUser.id);
  const referralUrl = `${window.location.origin}/register?ref=${currentUser.referralCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralUrl)}&color=c9a84c&bgcolor=111111`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`Join Legend Investors and earn daily income! Register with my link:\n${referralUrl}\n\nGet UGX 9,000 bonus on registration!`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(TELEGRAM_LINK, '_blank');
  };

  const levels = [
    { level: 1, label: 'Level 1', members: level1.length, rate: '27%', commission: commissions.level1, color: '#c9a84c', desc: 'Direct referral — when they invest' },
    { level: 2, label: 'Level 2', members: level2.length, rate: '2%', commission: commissions.level2, color: '#a78234', desc: 'Your Level 1\'s referrals' },
    { level: 3, label: 'Level 3', members: level3.length, rate: '1%', commission: commissions.level3, color: '#7c6128', desc: 'Your Level 2\'s referrals' },
  ];

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-[#c9a84c]" />
          <h1 className="text-white font-bold text-lg">Invite & Earn</h1>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="mx-4 mt-4 rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1100, #2d1f00)', border: '1px solid rgba(201,168,76,0.4)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f0c040, transparent)', transform: 'translate(30%, -30%)' }} />
        <p className="text-gray-400 text-xs mb-1 uppercase tracking-widest">Legend Investors</p>
        <h2 className="text-white text-2xl font-black mb-1">Invite Friends</h2>
        <p className="text-[#c9a84c] font-semibold text-sm mb-3">Earn up to <span className="text-xl font-black">27%</span> commission instantly</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Registration Bonus', value: 'UGX 9K' },
            { label: 'Your Code', value: currentUser.referralCode },
            { label: 'Level 1 Rate', value: '27%' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <p className="text-[#c9a84c] font-black text-sm">{item.value}</p>
              <p className="text-gray-500 text-[9px] mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code */}
      <div className="mx-4 mt-4 rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center gap-2 mb-4">
          <QrCode size={16} className="text-[#c9a84c]" />
          <p className="text-white font-bold text-sm">Your QR Code</p>
          <span className="text-gray-600 text-xs ml-auto">Scan to register</span>
        </div>

        <div className="flex gap-4 items-center">
          {/* QR Code */}
          <div className="flex-shrink-0 rounded-2xl p-3 flex items-center justify-center relative"
            style={{ background: '#111111', border: '2px solid rgba(201,168,76,0.5)', width: 140, height: 140 }}>
            {!qrLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl" style={{ background: '#111' }}>
                <QrCode size={40} className="text-[#c9a84c] opacity-40" />
                <p className="text-gray-600 text-[9px] mt-1">Loading QR...</p>
              </div>
            )}
            <img
              ref={qrRef}
              src={qrUrl}
              alt="QR Code"
              className="w-full h-full object-contain rounded-xl"
              onLoad={() => setQrLoaded(true)}
              style={{ opacity: qrLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />
          </div>

          {/* Link */}
          <div className="flex-1 min-w-0">
            <p className="text-gray-500 text-xs mb-2">Share your invite link:</p>
            <div className="rounded-xl px-3 py-2.5 mb-3 break-all" style={{ background: '#1e1e1e', border: '1px solid #333' }}>
              <p className="text-[#c9a84c] text-[10px] leading-relaxed">{referralUrl}</p>
            </div>
            <button onClick={copyLink}
              className="w-full py-3 rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2 gold-gradient transition-all"
              style={{ opacity: copied ? 0.9 : 1 }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        <button onClick={shareWhatsApp}
          className="py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25d366' }}>
          <span className="text-lg">💬</span> WhatsApp
        </button>
        <button onClick={shareTelegram}
          className="py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.3)', color: '#0088cc' }}>
          <span className="text-lg">✈️</span> Telegram
        </button>
      </div>

      {/* Commission Breakdown */}
      <div className="mx-4 mt-4 rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-[#c9a84c]" />
          <p className="text-white font-bold text-sm">3-Level Commission</p>
        </div>

        {/* Visual Tree */}
        <div className="flex flex-col items-center mb-4">
          {/* You */}
          <div className="w-16 h-8 rounded-xl flex items-center justify-center font-black text-xs text-black gold-gradient mb-1">YOU</div>
          <div className="w-0.5 h-4" style={{ background: '#c9a84c' }} />

          {/* L1 Row */}
          <div className="flex items-start gap-1 mb-1">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3" style={{ background: '#c9a84c' }} />
                <div className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-black gold-gradient">Lv1 · 27%</div>
                <div className="w-0.5 h-3 opacity-0" />
              </div>
              <div className="w-0.5 h-3" style={{ background: 'rgba(201,168,76,0.5)' }} />
            </div>
          </div>

          {/* L2 Row */}
          <div className="flex items-start gap-1 mb-1">
            <div className="flex flex-col items-center">
              <div className="px-3 py-1.5 rounded-xl text-[10px] font-bold" style={{ background: 'rgba(167,130,52,0.2)', color: '#a78234', border: '1px solid rgba(167,130,52,0.3)' }}>
                Lv2 · 2%
              </div>
              <div className="w-0.5 h-3" style={{ background: 'rgba(124,97,40,0.5)' }} />
            </div>
          </div>

          {/* L3 Row */}
          <div className="flex items-start gap-1">
            <div className="px-3 py-1.5 rounded-xl text-[10px] font-bold" style={{ background: 'rgba(124,97,40,0.15)', color: '#7c6128', border: '1px solid rgba(124,97,40,0.25)' }}>
              Lv3 · 1%
            </div>
          </div>
        </div>

        {/* Stats per level */}
        <div className="space-y-2">
          {levels.map(lvl => (
            <div key={lvl.level} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: '#1e1e1e', border: `1px solid ${lvl.level === 1 ? 'rgba(201,168,76,0.25)' : '#2a2a2a'}` }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-black px-2 py-0.5 rounded-full"
                    style={{ background: lvl.color }}>L{lvl.level}</span>
                  <p className="text-white text-xs font-semibold">{lvl.members} Members</p>
                </div>
                <p className="text-gray-600 text-[10px] mt-0.5">{lvl.desc}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-lg" style={{ color: lvl.color }}>{lvl.rate}</p>
                <p className="text-gray-500 text-[10px]">{formatUGX(lvl.commission)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mx-4 mt-3 mb-6 rounded-2xl p-4" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)' }}>
        <p className="text-[#c9a84c] font-bold text-sm mb-2">How it works</p>
        <div className="space-y-2 text-xs text-gray-500">
          <p>1. Share your unique invite link or QR code with friends.</p>
          <p>2. When they register and make a deposit, you instantly earn <strong className="text-[#c9a84c]">27%</strong> of their investment.</p>
          <p>3. When their referrals invest, you earn <strong className="text-[#c9a84c]">2%</strong>. Their referrals earn you <strong className="text-[#c9a84c]">1%</strong>.</p>
          <p>4. Commission is credited to your balance immediately after their recharge is approved.</p>
        </div>
      </div>
    </div>
  );
}
