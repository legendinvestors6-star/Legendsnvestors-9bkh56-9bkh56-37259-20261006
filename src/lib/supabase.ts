import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ssuzpvmseozafgweykkg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdXpwdm1zZW96YWZnd2V5a2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTM0NjMsImV4cCI6MjEwNzgyOTQ2M30.HH4gTqBpvYQ-HFwHfvQZ3GQWr_zy58fXoinctG7LmUU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
