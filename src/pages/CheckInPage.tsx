useEffect(() => {
  const load = async () => {
    let u: any = null;

    // 1. FIRST: localStorage (works instantly on GitHub + Vercel)
    try {
      const raw = localStorage.getItem('legend_session') || localStorage.getItem('legend_current_user') || localStorage.getItem('currentUser');
      if (raw) {
        u = JSON.parse(raw);
      }
    } catch {}

    // 2. SECOND: Supabase if local not found
    if (!u) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const meta = data.session.user.user_metadata || {};
          u = {
            id: data.session.user.id,
            email: data.session.user.email,
            balance: meta.balance || 9000,
            checkInDays: meta.checkInDays || 0,
            lastCheckIn: meta.lastCheckIn || null,
            ...meta
          };
        }
      } catch {}
    }

    // 3. If still no user, DON'T redirect immediately - show message and redirect after 2 sec
    if (!u) {
      console.log("No user found");
      toast.error("Please login first");
      setTimeout(() => navigate('/login'), 2000);
      setInitialLoading(false);
      return;
    }

    setUser(u);
    setInitialLoading(false);
  };
  load();
}, []);
```

**And add this to your `src/lib/supabase.ts` to fix GitHub/Vercel session persistence:**

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
