const [status, setStatus] = useState<'idle' | 'loading' | 'stk_sent'>('idle')

// When opening - idle
if (status === 'idle') {
  return (
    <div>
      <h1 className="text-gold">Recharge Account</h1>
      <input placeholder="Amount UGX" />
      <div className="providers">
        <button onClick={()=>setProvider('mtn')}>MTN</button>
        <button onClick={()=>setProvider('airtel')}>Airtel Uganda</button>
      </div>
      <input placeholder="Phone +256" />
      <button onClick={handleRecharge}>Recharge</button>
    </div>
  )
}

// After clicking - stk_sent
if (status === 'stk_sent') {
  return (
    <div>
      <h1 className="text-gold">Recharge Account</h1>
      <p className="text-gray">Waiting for PIN...</p>
      <div className="bg-dark p-4 rounded">
        ⏳ STK sent! Enter PIN on phone
      </div>
      {/* The phone's own PIN popup will show like your screenshot */}
    </div>
  )
}

async function handleRecharge() {
  setStatus('loading')
  const res = await fetch('/api/payments/create', {
    method: 'POST',
    body: JSON.stringify({ amount, phone, provider, userId })
  })
  const data = await res.json()
  if (data.status === 'pending') {
    setStatus('stk_sent')
  }
}