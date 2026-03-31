import { supabase } from './src/supabaseClient';
async function run() {
  const { data, error } = await supabase.from('invoices').select('non_existent_column').limit(1);
  console.log(data);
  console.log(error);
}
run();
