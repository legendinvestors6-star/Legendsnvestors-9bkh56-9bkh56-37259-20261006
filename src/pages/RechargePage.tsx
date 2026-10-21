import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext' // adjust import if needed

export default function RechargePage() {
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('airtel')
  const [status, setStatus] = useState<'idle' | 'loading' | 'stk_sent' | 'failed'>('idle')
  const [message, setMessage] = useState('')
  const { user } = useAuth()

  async function handleRecharge() {
    if (!amount || !phone) {
      setMessage('Enter amount and phone')
      return
    }
    setStatus('loading')
    setMessage('')
    
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: Number(amount), 
          phone, 
          provider, 
          userId: user?.id 
        })
      })
      const data = await res.json()
      console.log(data)
      
      if (data.status === 'pending' || data.status === 'stk_sent') {
        setStatus('stk_sent')
      } else {
        setStatus('failed')
        setMessage(data.pesajet_error || data.error || 'Failed to send STK')
      }
    } catch (e: any) {
      setStatus('failed')
      setMessage(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-2xl font-bold text-yellow-400 text-center mb-2">Recharge Account</h1>
      
      {status === 'idle' || status === 'loading' || status === 'failed' ? (
        <>
          {status !== 'idle' && status !== 'loading' && (
            <p className="text-center text-gray-400 mb-4">{status === 'loading' ? 'Waiting for PIN...' : ''}</p>
          )}
          
          {status === 'failed' && (
            <div className="bg-red-900/30 p-3 rounded mb-4 text-red-300 text-sm">
              {message}
            </div>
          )}

          {status === 'stk_sent' ? null : (
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="text-sm text-gray-400">Amount (UGX)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="50000"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Provider</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setProvider('mtn')}
                    className={`p-4 rounded-lg border ${provider === 'mtn' ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-800 bg-zinc-900'}`}
                  >
                    MTN
                  </button>
                  <button
                    onClick={() => setProvider('airtel')}
                    className={`p-4 rounded-lg border ${provider === 'airtel' ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-800 bg-zinc-900'}`}
                  >
                    Airtel Uganda
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Phone Number</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 mt-1"
                />
              </div>

              <button
                onClick={handleRecharge}
                disabled={status === 'loading'}
                className="w-full bg-yellow-500 text-black font-bold py-3 rounded-lg mt-6 disabled:opacity-50"
              >
                {status === 'loading' ? 'Sending...' : 'Recharge'}
              </button>
            </div>
          )}
        </>
      ) : null}

      {status === 'stk_sent' && (
        <div className="max-w-md mx-auto text-center mt-8">
          <p className="text-gray-400 mb-4">Waiting for PIN...</p>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <p className="text-lg">⏳ STK sent! Enter PIN on phone</p>
            <p className="text-sm text-gray-400 mt-2">Check your phone {phone} and enter PIN to confirm</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 text-yellow