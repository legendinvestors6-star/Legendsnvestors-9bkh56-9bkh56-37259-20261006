 const handleRecharge = async () => {
  const num = Number(amount);
  if (!num || num < MIN) {
    alert("Minimum is UGX 30,000");
    return;
  }
  if (!phone.trim()) {
    alert("Enter phone number");
    return;
  }
  setLoading(true);
  try {
    const reference = `LGD${Date.now()}`
    // Save directly to Supabase - no /api needed
    const { error } = await supabase.from('recharges').insert([{
      reference,
      amount: num,
      phone: phone.trim(),
      user_id: phone.trim(),
      status: 'pending',
      provider: 'mtn'
    }])
    if(error) throw new Error(error.message)

    // Start polling immediately
    startAutoPolling(reference, num)
    
  } catch (e: any) {
    alert("Error: " + e.message)
    setLoading(false)
  }
 }