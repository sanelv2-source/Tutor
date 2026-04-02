import { createClient } from '@supabase/supabase-js';

// Vi skriver inn de ekte kodene her for å tvinge appen til å virke
const supabaseUrl = 'https://jshciiidthsxjhwlxmbh.supabase.co';
const supabaseAnonKey = 'sb_publishable_iaTt8xzIHCGGoy_m2HrV2A_o2rMES6D';

console.log('Supabase URL in use:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
