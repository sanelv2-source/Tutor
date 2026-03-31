import { createClient } from '@supabase/supabase-js';

// Vi skriver inn de ekte kodene her for å tvinge appen til å virke
const supabaseUrl = 'https://jshciiidthsxjhwlxmbh.supabase.co';
const supabaseAnonKey = 'sb_publishable_iaTt8xzIHCGGoy_m2HrV2A_o2rMES6D';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  role: 'tutor' | 'student';
  tutor_id?: string | null;
  has_paid?: boolean;
  name?: string;
};
