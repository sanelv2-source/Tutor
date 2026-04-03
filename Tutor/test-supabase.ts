import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jshciiidthsxjhwlxmbh.supabase.co';
const supabaseAnonKey = 'sb_publishable_iaTt8xzIHCGGoy_m2HrV2A_o2rMES6D';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('lessons').select('*').limit(1);
  console.log('lessons:', error ? error.message : data);
}
test();
