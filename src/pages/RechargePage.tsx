import { useState } from 'react';
import { getCurrentUser, createRechargeOrder } from '@/lib/storage';
import { toast } from 'sonner';

export default function RechargePage() {
  const [amount, setAmount] = useState('');
  const user = getCurrentUser();
  
  const handleRecharge = () => {
    if (!user) return;
    const num = Number(amount);
    if (!num || num < 1000) { toast.error('Min 1000'); return; }
    createRechargeOrder(user.id, num, 'MTN', user.phone);
    toast.success('Recharge submitted, wait admin approval');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-xl font-bold mb-4">Recharge</h1>
      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount" className="w-full bg-zinc-800 p-3 rounded-xl mb-3" type="number" />
      <button onClick={handleRecharge} className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl">Submit</button>
    </div>
  );
}