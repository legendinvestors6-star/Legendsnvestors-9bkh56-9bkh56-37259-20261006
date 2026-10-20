const handleRecharge = async () => {
  const num = Number(amount);
  if (!num || num < 30000) { alert("Minimum is UGX 30,000"); return; }
  if (!phone.trim()) { alert("Enter phone number"); return; }
  setLoading(true);
  try {
    const reference = `LGD${Date.now()}`
    const { error } = await supabase.from('recharges').insert([{ 
      reference, amount: num, phone: phone.trim(), status: 'pending' 
    }])
    if(error) throw error
    toast.success("Pending... Enter PIN on phone!")
    // polling starts here
  } catch (e) { alert("Error: " + e.message); setLoading(false) }
}
