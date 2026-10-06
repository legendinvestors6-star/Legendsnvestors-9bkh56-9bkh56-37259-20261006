import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, formatUGX } from '@/lib/storage';

const TASKS = [
  { level: 'Lv1', label: 'Invite 5 Level 1 investors', reward: 10000, target: 5 },
  { level: 'Lv2', label: 'Invite 10 Level 1 investors', reward: 40000, target: 10 },
  { level: 'Lv3', label: 'Invite 30 Level 1 investors', reward: 130000, target: 30 },
  { level: 'Lv4', label: 'Invite 60 Level 1 investors', reward: 280000, target: 60 },
];

export default function TaskCenterPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  if (!currentUser) { navigate('/'); return null; }

  const cumulativeRewards = 0;

  return (
    <div className="app-container min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="flex items-center gap-3 p-4" style={{ background: '#111111', borderBottom: '1px solid #2a2a2a' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e' }}>
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg">Task Center</h1>
      </div>

      {/* Cumulative Rewards */}
      <div className="mx-4 mt-4 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #1a1400, #2a2000)', border: '1px solid rgba(201,168,76,0.3)' }}>
        <p className="text-gray-400 text-sm mb-1">Cumulative rewards</p>
        <p className="text-[#c9a84c] text-3xl font-black">{formatUGX(cumulativeRewards)}</p>
      </div>

      {/* Task List */}
      <div className="px-4 mt-4 space-y-3">
        {TASKS.map(task => (
          <div key={task.level} className="rounded-2xl p-4" style={{ background: '#151515', border: '1px solid #2a2a2a' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-black px-2 py-0.5 rounded-full gold-gradient">{task.level}</span>
                  <span className="text-gray-300 text-sm">{task.label}</span>
                </div>
                <p className="text-gray-500 text-xs">Get: <span className="text-[#c9a84c] font-bold">{formatUGX(task.reward)}</span></p>
              </div>
              <span className="text-[10px] text-gray-600 px-2 py-1 rounded-full" style={{ background: '#222' }}>In Progress</span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>0 Current</span>
              <span>{task.target} Target</span>
            </div>

            <div className="w-full h-1.5 rounded-full" style={{ background: '#2a2a2a' }}>
              <div className="h-1.5 rounded-full gold-gradient" style={{ width: '0%' }} />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">0/{task.target} Progress</p>
          </div>
        ))}
      </div>
      <div className="h-6" />
    </div>
  );
}
