import { ChevronLeft, Shield, TrendingUp, Globe, Lock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS, formatUGX } from '@/constants/products';

export default function RegulationPage() {
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
          <h1 className="text-white font-bold text-lg">Regulation</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="p-5 flex gap-4" style={{ background: 'linear-gradient(135deg, #0f0f0a, #1a1400)' }}>
        <div className="flex-1 text-white">
          <h2 className="text-2xl font-black leading-tight text-white">LEGEND<br /><span className="text-[#c9a84c]">ONE BMW</span></h2>
          <p className="text-gray-400 text-sm mt-1 italic">Invest in the Future</p>
          <p className="text-[#c9a84c] font-semibold">Earn Every Day</p>
          <p className="text-gray-600 text-xs mt-1">Your Smart Choice for Long-Term Passive Income</p>
        </div>
        <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=120&h=120&fit=crop" alt="BMW" className="w-28 h-28 rounded-xl object-cover" style={{ border: '1px solid rgba(201,168,76,0.3)' }} />
      </div>

      {/* Product Table */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
          <div className="grid grid-cols-5 text-xs font-semibold" style={{ background: 'linear-gradient(135deg, #c9a84c, #f0c040)' }}>
            {['Product', 'Price', 'Daily', 'Total', 'Days'].map(h => (
              <div key={h} className="py-2.5 px-1 text-center text-black font-bold">{h}</div>
            ))}
          </div>
          {PRODUCTS.map((p, i) => (
            <div key={p.id} className="grid grid-cols-5 text-xs" style={{ background: i % 2 === 0 ? '#151515' : '#111111', borderTop: '1px solid #222' }}>
              <div className="py-2 px-1 text-center">
                <span className="text-[9px] font-bold text-black px-1 py-0.5 rounded gold-gradient">VIP{p.vip}</span>
              </div>
              <div className="py-2 px-1 text-center text-gray-400">{(p.price/1000).toFixed(0)}K</div>
              <div className="py-2 px-1 text-center text-[#c9a84c] font-semibold">{(p.dailyIncome/1000).toFixed(0)}K</div>
              <div className="py-2 px-1 text-center text-gray-400">{(p.totalIncome/1000).toFixed(0)}K</div>
              <div className="py-2 px-1 text-center text-gray-600">{p.term}d</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="px-4 mt-4 grid grid-cols-5 gap-2 text-center">
        {[
          { icon: Shield, label: 'Secure' },
          { icon: TrendingUp, label: 'Daily' },
          { icon: Lock, label: 'Stable' },
          { icon: Globe, label: 'Global' },
          { icon: Users, label: 'Together' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <Icon size={16} className="text-[#c9a84c]" />
              </div>
              <p className="text-[9px] text-gray-500 font-medium">{item.label}</p>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[#c9a84c] font-semibold text-sm mt-4 px-4">Legend One BMW — More Than a Product, It's a Future!</p>

      <div className="px-4 mt-4 mb-6 space-y-2 text-sm text-gray-500 leading-relaxed">
        <p>When a friend you invite registers and invests, you will immediately receive a cash reward equal to <strong className="text-[#c9a84c]">27%</strong> of their investment amount.</p>
        <p>When a Level 2 team member invests, you will receive a <strong className="text-[#c9a84c]">2%</strong> cash reward.</p>
        <p>When a Level 3 team member invests, you will receive a <strong className="text-[#c9a84c]">1%</strong> cash reward.</p>
        <p>Register to receive a <strong className="text-[#c9a84c]">9,000 UGX</strong> bonus. Minimum deposit is <strong className="text-[#c9a84c]">30,000 UGX</strong> (covers VIP 1 entry product) and minimum withdrawal is <strong className="text-[#c9a84c]">9,000 UGX</strong>. The withdrawal fee is 16%.</p>
        <p>Each product runs for 60 days. Income is settled every 24 hours.</p>
      </div>
    </div>
  );
}
