import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const ADMIN_EMAIL = 'info@tutorflyt.no';
const TEMP_ADMIN_PASSWORD = 'Tutorflyt23';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL/VITE_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY må være satt.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((item) => String(item.email || '').trim().toLowerCase() === email);
    if (user) return user;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  let authUser = await findUserByEmail(ADMIN_EMAIL);

  if (!authUser) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: TEMP_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Tutorflyt Admin',
        role: 'admin',
      },
    });

    if (error) throw error;
    authUser = data.user;
    console.log(`Opprettet admin-bruker: ${ADMIN_EMAIL}`);
  } else {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('password_changed_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profile?.password_changed_at) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: TEMP_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          role: 'admin',
        },
      });

      if (error) throw error;
      console.log(`Satte midlertidig passord for admin-bruker: ${ADMIN_EMAIL}`);
    } else {
      console.log(`Admin-bruker finnes og har allerede byttet passord: ${ADMIN_EMAIL}`);
    }
  }

  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('password_changed_at')
    .eq('id', authUser.id)
    .maybeSingle();

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: authUser.id,
      email: ADMIN_EMAIL,
      full_name: authUser.user_metadata?.full_name || 'Tutorflyt Admin',
      role: 'admin',
      subscription_status: 'active',
      force_password_change: !existingProfile?.password_changed_at,
    });

  if (profileError) throw profileError;
  console.log('Admin-profilen er klar. Første innlogging bruker midlertidig passord og tvinger passordbytte.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
