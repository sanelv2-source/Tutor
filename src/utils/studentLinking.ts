import { supabase } from '../supabaseClient';

export async function linkStudentProfileByEmail() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    if (userError.message.includes('Refresh Token')) {
      await supabase.auth.signOut().catch(() => {});
    }
    return;
  }
  if (!user?.email) return;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'student') return;

  const normalizedEmail = user.email.trim().toLowerCase();

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, profile_id')
    .ilike('email', normalizedEmail)
    .is('profile_id', null)
    .maybeSingle();

  if (studentError || !student) return;

  const { error: updateError } = await supabase
    .from('students')
    .update({ profile_id: user.id })
    .eq('id', student.id)
    .is('profile_id', null);

  if (updateError) {
    console.error('Failed to link student profile:', updateError);
  }
}

export async function linkStudentProfileByEmailFallback() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !user.email) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'student') return;

  const normalizedEmail = user.email.trim().toLowerCase();

  const { data: student } = await supabase
    .from('students')
    .select('id, profile_id')
    .ilike('email', normalizedEmail)
    .is('profile_id', null)
    .maybeSingle();

  if (!student) return;

  await supabase
    .from('students')
    .update({
      profile_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', student.id)
    .is('profile_id', null);
}
