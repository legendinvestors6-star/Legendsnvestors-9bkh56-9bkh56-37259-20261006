import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.error('❌ MISSING VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY - Check Vercel Env Variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
