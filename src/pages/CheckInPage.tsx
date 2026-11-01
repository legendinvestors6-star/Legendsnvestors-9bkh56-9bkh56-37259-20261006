import { useState, useEffect } from 'react';
import { ChevronLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function CheckInPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/');
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      setUser(data || { id: authUser.id, check_in_days: 0, last_check_in: null, balance: 0 });
    };
    init();
  }, []);

  if (!user) return null;

  const today = new Date().toDateString();
  const hasCheckedIn = user.last_check_in === today;

  const handleCheckIn = async () => {
    if (hasCheckedIn) {
      toast.info('Already checked in today!');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          check_in_days: (user.check_in_days || 0) + 1,
          last_check_in: today,
          balance: (user.balance || 0) + 300
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Check-in successful! +UGX 300`);
      setUser(data);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // keep your same JSX, just replace user.checkInDays -> user.check_in_days
    // and user.lastCheckIn -> user.last_check_in
    <div>...</div>
  )
}
