import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="app-container min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="text-center px-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex flex-col gap-1">
            <div className="w-6 h-1 rounded-full gold-gradient" />
            <div className="w-6 h-1 rounded-full gold-gradient" />
            <div className="w-6 h-1 rounded-full gold-gradient" />
          </div>
          <p className="text-xl font-black gold-gradient-text">LEGEND</p>
        </div>
        <p className="text-6xl font-black text-white mb-2">404</p>
        <p className="text-gray-500 mb-6">Page not found</p>
        <button onClick={() => navigate('/home')} className="gold-gradient text-black font-bold px-6 py-3 rounded-xl">
          Go Home
        </button>
      </div>
    </div>
  );
}
