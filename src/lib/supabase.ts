import { createClient } from '@supabase/supabase-js';

// Vi skriver inn de ekte kodene her for å tvinge appen til å virke
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  role: 'tutor' | 'student' | 'admin';
  plan?: 'free' | 'start' | 'pro' | 'premium';
  tutor_id?: string | null;
  has_paid?: boolean;
  name?: string;
  force_password_change?: boolean;
  password_changed_at?: string | null;
};
