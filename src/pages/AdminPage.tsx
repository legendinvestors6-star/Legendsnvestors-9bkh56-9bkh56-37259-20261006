import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [tab, setTab] = useState<'users'|'gifts'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [selected, setSelected] = useState('');
  const [giftCode, setGiftCode] = useState('');
  const [giftAmount, setGiftAmount] = useState('');

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    const { data: g } = await supabase.from('gift_codes').select('*').order('created_at', { ascending: false });
    setUsers(u || []);
    setGifts(g || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function credit() {
    if (!selected || !amount) return alert('Select user & amount');
    const u = users.find(x => x.id === selected);
    await supabase.from('users').update({ balance: Number(u.balance) + Number(amount) }).eq('id', selected);
    alert('✅ Credited REAL!');
    load();
  }
  async function deduct() {
    if (!selected || !amount) return alert('Select user & amount');
    const u = users.find(x => x.id === selected);
    await supabase.from('users').update({ balance: Math.max(0, Number(u.balance) - Number(amount)) }).eq('id', selected);
    alert('✅ Deducted');
    load();
  }
  async function createGift() {
    if (!giftCode || !giftAmount) return alert('Enter code & amount');
    const { error } = await supabase.from('gift_codes').insert({ code: giftCode.toUpperCase(), amount: Number(giftAmount), is_used: false });
    if (error) return alert(error.message);
    alert('✅ Gift Code Created: ' + giftCode.toUpperCase());
    setGiftCode(''); setGiftAmount('');
    load();
  }
  async function deleteGift(id: string) {
    if (!confirm('Delete this gift code?')) return;
    await supabase.from('gift_codes').delete().eq('id', id);
    load();
  }

  if (loading) return <div className="p-8 text-center">Loading REAL DB...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold">ADMIN - REAL FULL CONTROL</h1>
      <p className="text-green-600 mb-4 font-bold">{users.length} users | {gifts.length} gift codes - Supabase LIVE</p>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('users')} className={`flex-1 py-3 rounded-lg font-bold ${tab==='users'?'bg-black text-white':'bg-white border'}`}>Users - Credit/Deduct</button>
        <button onClick={() => setTab('gifts')} className={`flex-1 py-3 rounded-lg font-bold ${tab==='gifts'?'bg-black text-white':'bg-white border'}`}>Gift Codes - Redeem</button>
      </div>

      {tab==='users' && (
        <>
          <div className="bg-white border p-4 rounded-lg shadow mb-4">
            <select value={selected} onChange={e => setSelected(e.target.value)} className="border p-3 w-full mb-3 rounded-lg">
              <option value="">-- Select user --</option>
              {users.map((u:any) => <option key={u.id} value={u.id}>{u.phone} - {u.balance} UGX</option>)}
            </select>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="border p-3 w-full mb-3 rounded-lg" />
            <div className="flex gap-2">
              <button onClick={credit} className="bg-green-600 text-white flex-1 py-3 rounded-lg font-bold">CREDIT</button>
              <button onClick={deduct} className="bg-red-600 text-white flex-1 py-3 rounded-lg font-bold">DEDUCT</button>
            </div>
          </div>
          <div className="bg-white border rounded-lg">
            {users.map((u:any) => <div key={u.id} className="p-3 border-b flex justify-between"><span>{u.phone}</span><span className="font-bold">{u.balance} UGX</span></div>)}
          </div>
        </>
      )}

      {tab==='gifts' && (
        <>
          <div className="bg-white border p-4 rounded-lg shadow mb-4">
            <h3 className="font-bold mb-2">Create Redeem Gift Code</h3>
            <input value={giftCode} onChange={e => setGiftCode(e.target.value)} placeholder="Code e.g. BONUS100" className="border p-3 w-full mb-2 rounded-lg uppercase" />
            <input type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} placeholder="Amount e.g. 50000" className="border p-3 w-full mb-3 rounded-lg" />
            <button onClick={createGift} className="bg-purple-600 text-white w-full py-3 rounded-lg font-bold">CREATE GIFT CODE</button>
            <p className="text-xs text-gray-500 mt-2">Users will redeem this code in their Gift/Reward page to get money.</p>
          </div>
          <div className="bg-white border rounded-lg">
            <div className="p-3 font-bold border-b">All Gift Codes</div>
            {gifts.map((g:any) => (
              <div key={g.id} className="p-3 border-b flex justify-between items-center">
                <div>
                  <div className="font-bold">{g.code} - {g.amount} UGX</div>
                  <div className="text-xs">{g.is_used ? `✅ Used by ${g.used_by || 'someone'}` : '🟢 Active - Not used'}</div>
                </div>
                <button onClick={() => deleteGift(g.id)} className="bg-red-100 text-red-600 px-3 py-1 rounded text-sm">Delete</button>
              </div>
            ))}
            {gifts.length===0 && <div className="p-4 text-center text-gray-500">No codes yet</div>}
          </div>
        </>
      )}

      <button onClick={load} className="mt-4 w-full bg-black text-white py-3 rounded-lg">🔄 Refresh</button>
    </div>
  );
                }
