import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg">About Us</h1>
      </div>

      <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=480&h=200&fit=crop" alt="Legend BMW" className="w-full h-44 object-cover" />

      <div className="px-4 py-5 space-y-4">
        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid rgba(201,168,76,0.2)' }}>
          <h2 className="text-[#c9a84c] font-black text-xl mb-3">Legend — BMW</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Legend is a premium investment community built around immersive Legend One BMW technology, strength and the courage of Africa's most majestic animals.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-3">
            Our investment plans allow members to build income through clear daily returns, transparent plan periods and dependable account services.
          </p>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <h3 className="text-[#c9a84c] font-bold text-base mb-3">Legendary BMW Heritage</h3>
          <div className="space-y-3">
            {[
              { model: 'BMW M1', desc: 'Built between 1978 and 1981, this wedge-shaped, mid-engined supercar designed by Giugiaro birthed the high-performance BMW M Division.' },
              { model: 'BMW E30 M3', desc: 'Launched in 1986, this pure driving machine dominated global touring car racing with its high-revving S14 four-cylinder engine.' },
              { model: 'BMW 3.0 CSL "Batmobile"', desc: 'Introduced in 1973, this aerodynamic lightweight champion first wore the iconic M stripes.' },
              { model: 'BMW 2002', desc: 'This compact sport sedan solidified BMW\'s reputation worldwide as the creator of the Ultimate Driving Machine.' },
              { model: 'BMW E39 M5', desc: 'Widely regarded as the ultimate sports sedan, pairing a sublime chassis with a muscular 4.9-liter V8 engine.' },
              { model: 'BMW Z8', desc: 'Styled by Henrik Fisker with an aluminum spaceframe, this modern classic famously starred in the James Bond film "The World Is Not Enough".' },
            ].map(item => (
              <div key={item.model} className="pl-3" style={{ borderLeft: '2px solid rgba(201,168,76,0.4)' }}>
                <p className="text-[#c9a84c] font-semibold text-sm">{item.model}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
          <p className="text-gray-400 text-sm leading-relaxed">
            Every Legend plan is built on three promises: transparent pricing, clear earnings information and responsive member support.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mt-3">
            Legend celebrates ambition across Africa and gives every member a confident, premium place to grow their financial journey.
          </p>
        </div>
      </div>
    </div>
  );
}
