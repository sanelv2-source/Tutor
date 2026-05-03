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

  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, tutor_id, profile_id')
    .ilike('email', normalizedEmail)
    .or(`profile_id.is.null,profile_id.eq.${user.id}`);

  if (studentError || !students?.length) return;

  const linkedTutorIds = new Set(
    students
      .filter(student => student.profile_id === user.id)
      .map(student => student.tutor_id)
      .filter(Boolean)
  );
  const queuedTutorIds = new Set<string>();
  const rowsToLink = students.filter(student => {
    if (student.profile_id !== null || linkedTutorIds.has(student.tutor_id) || queuedTutorIds.has(student.tutor_id)) {
      return false;
    }
    queuedTutorIds.add(student.tutor_id);
    return true;
  });

  for (const student of rowsToLink) {
    const { error: updateError } = await supabase
      .from('students')
      .update({ profile_id: user.id })
      .eq('id', student.id)
      .is('profile_id', null);

    if (updateError) {
      console.error('Failed to link student profile:', updateError);
    }
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

  const { data: students } = await supabase
    .from('students')
    .select('id, tutor_id, profile_id')
    .ilike('email', normalizedEmail)
    .or(`profile_id.is.null,profile_id.eq.${user.id}`);

  if (!students?.length) return;

  const linkedTutorIds = new Set(
    students
      .filter(student => student.profile_id === user.id)
      .map(student => student.tutor_id)
      .filter(Boolean)
  );
  const queuedTutorIds = new Set<string>();
  const rowsToLink = students.filter(student => {
    if (student.profile_id !== null || linkedTutorIds.has(student.tutor_id) || queuedTutorIds.has(student.tutor_id)) {
      return false;
    }
    queuedTutorIds.add(student.tutor_id);
    return true;
  });

  for (const student of rowsToLink) {
    await supabase
      .from('students')
      .update({
        profile_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id)
      .is('profile_id', null);
  }
}
