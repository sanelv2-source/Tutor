const OPTIONAL_DB_ERROR_CODES = new Set(['42P01', '42703']);

export const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

export const getBearerToken = (value) => String(value ?? '').replace(/^Bearer\s+/i, '').trim();

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const isOptionalDbError = (error) => {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return OPTIONAL_DB_ERROR_CODES.has(error?.code) || message.includes('does not exist');
};

async function runQuery(label, operation, { optional = true } = {}) {
  const { data, error } = await operation();

  if (error) {
    if (optional && isOptionalDbError(error)) {
      console.warn(`Skipping optional cleanup step "${label}":`, error.message);
      return data ?? null;
    }

    console.error(`Account deletion cleanup failed at "${label}":`, error);
    throw new Error('Kunne ikke slette all kontodata. Kontoen er ikke slettet.');
  }

  return data ?? null;
}

async function selectRows(label, operation) {
  return (await runQuery(label, operation, { optional: true })) ?? [];
}

async function deleteWhereEq(supabaseAdmin, table, column, value) {
  if (value === null || value === undefined || value === '') return;
  await runQuery(`${table}.${column}`, () => supabaseAdmin.from(table).delete().eq(column, value));
}

async function deleteWhereIn(supabaseAdmin, table, column, values) {
  const ids = unique(values);
  if (ids.length === 0) return;
  await runQuery(`${table}.${column} in`, () => supabaseAdmin.from(table).delete().in(column, ids));
}

function storagePathFromUrl(value, bucket) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (!/^https?:\/\//i.test(raw)) {
    return raw.replace(/^\/+/, '');
  }

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
  ];

  const marker = markers.find((item) => decoded.includes(item));
  if (!marker) return '';

  return decoded
    .slice(decoded.indexOf(marker) + marker.length)
    .split('?')[0]
    .replace(/^\/+/, '');
}

async function removeStorageObjects(supabaseAdmin, bucket, paths) {
  const cleanedPaths = unique(paths.map((path) => String(path ?? '').trim().replace(/^\/+/, '')));
  if (cleanedPaths.length === 0) return 0;

  let removed = 0;
  for (let index = 0; index < cleanedPaths.length; index += 100) {
    const chunk = cleanedPaths.slice(index, index + 100);
    const { error } = await supabaseAdmin.storage.from(bucket).remove(chunk);
    if (error) {
      console.warn(`Could not remove ${bucket} objects during account deletion:`, error.message);
      continue;
    }
    removed += chunk.length;
  }

  return removed;
}

async function listStoragePrefix(supabaseAdmin, bucket, prefix) {
  const normalizedPrefix = String(prefix ?? '').replace(/^\/+|\/+$/g, '');
  if (!normalizedPrefix) return [];

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(normalizedPrefix, { limit: 1000 });

  if (error) {
    console.warn(`Could not list ${bucket}/${normalizedPrefix} during account deletion:`, error.message);
    return [];
  }

  return (data || [])
    .filter((item) => item?.name)
    .map((item) => `${normalizedPrefix}/${item.name}`);
}

async function fetchStudentIdsForUser(supabaseAdmin, userId, email) {
  const rowsByProfile = await selectRows('student rows by profile', () =>
    supabaseAdmin.from('students').select('id').eq('profile_id', userId)
  );

  const rowsByEmail = email
    ? await selectRows('student rows by email', () =>
        supabaseAdmin.from('students').select('id').eq('email', email)
      )
    : [];

  return unique([...rowsByProfile, ...rowsByEmail].map((row) => row?.id));
}

async function fetchStudentIdsForTutor(supabaseAdmin, userId) {
  const rows = await selectRows('student rows by tutor', () =>
    supabaseAdmin.from('students').select('id').eq('tutor_id', userId)
  );

  return unique(rows.map((row) => row?.id));
}

async function collectStoragePaths(supabaseAdmin, userId, studentIds, profile) {
  const resourceRows = await selectRows('resource file paths by tutor', () =>
    supabaseAdmin
      .from('resources')
      .select('file_path')
      .eq('tutor_id', userId)
      .not('file_path', 'is', null)
  );

  const assignmentRowsByTutor = await selectRows('assignment attachment paths by tutor', () =>
    supabaseAdmin
      .from('assignments')
      .select('attachment_path')
      .eq('tutor_id', userId)
      .not('attachment_path', 'is', null)
  );

  const assignmentRowsByStudent = studentIds.length
    ? await selectRows('assignment attachment paths by student', () =>
        supabaseAdmin
          .from('assignments')
          .select('attachment_path')
          .in('student_id', studentIds)
          .not('attachment_path', 'is', null)
      )
    : [];

  const submissionRowsByTutor = await selectRows('submission file urls by tutor', () =>
    supabaseAdmin
      .from('submissions')
      .select('file_url')
      .eq('tutor_id', userId)
      .not('file_url', 'is', null)
  );

  const submissionRowsByStudent = studentIds.length
    ? await selectRows('submission file urls by student', () =>
        supabaseAdmin
          .from('submissions')
          .select('file_url')
          .in('student_id', studentIds)
          .not('file_url', 'is', null)
      )
    : [];

  const submissionPrefixPaths = await listStoragePrefix(supabaseAdmin, 'submissions', `${userId}/submissions`);
  const resourcePrefixPaths = await listStoragePrefix(supabaseAdmin, 'resources', userId);

  const avatarPath = storagePathFromUrl(profile?.avatar_url, 'avatars');

  return {
    avatars: avatarPath ? [avatarPath] : [],
    resources: unique([
      ...resourceRows.map((row) => row?.file_path),
      ...assignmentRowsByTutor.map((row) => row?.attachment_path),
      ...assignmentRowsByStudent.map((row) => row?.attachment_path),
      ...resourcePrefixPaths,
    ]),
    submissions: unique([
      ...submissionRowsByTutor.map((row) => storagePathFromUrl(row?.file_url, 'submissions')),
      ...submissionRowsByStudent.map((row) => storagePathFromUrl(row?.file_url, 'submissions')),
      ...submissionPrefixPaths,
    ]),
  };
}

async function deleteStudentRelatedRows(supabaseAdmin, studentIds, email) {
  await deleteWhereIn(supabaseAdmin, 'resource_assignments', 'student_id', studentIds);
  await deleteWhereIn(supabaseAdmin, 'student_invitations', 'student_id', studentIds);
  await deleteWhereIn(supabaseAdmin, 'conversations', 'student_id', studentIds);
  await deleteWhereIn(supabaseAdmin, 'submissions', 'student_id', studentIds);
  await deleteWhereIn(supabaseAdmin, 'assignments', 'student_id', studentIds);
  await deleteWhereIn(supabaseAdmin, 'reports', 'student_id', studentIds);
  await deleteWhereIn(supabaseAdmin, 'lessons', 'student_id', studentIds);
  await deleteWhereIn(supabaseAdmin, 'invoices', 'student_id', studentIds);

  if (email) {
    await deleteWhereEq(supabaseAdmin, 'invoices', 'email', email);
  }

  await deleteWhereIn(supabaseAdmin, 'students', 'id', studentIds);
}

async function deleteTutorRelatedRows(supabaseAdmin, userId) {
  await deleteWhereEq(supabaseAdmin, 'messages', 'sender_id', userId);
  await deleteWhereEq(supabaseAdmin, 'conversations', 'tutor_id', userId);
  await deleteWhereEq(supabaseAdmin, 'submissions', 'tutor_id', userId);
  await deleteWhereEq(supabaseAdmin, 'assignments', 'tutor_id', userId);
  await deleteWhereEq(supabaseAdmin, 'resources', 'tutor_id', userId);
  await deleteWhereEq(supabaseAdmin, 'student_invitations', 'tutor_id', userId);
  await deleteWhereEq(supabaseAdmin, 'lessons', 'tutor_id', userId);
  await deleteWhereEq(supabaseAdmin, 'faste_tider', 'tutor_id', userId);
  await deleteWhereEq(supabaseAdmin, 'tutor_vacation', 'tutor_id', userId);
  await deleteWhereEq(supabaseAdmin, 'vacations', 'tutor_id', userId);
  await deleteWhereEq(supabaseAdmin, 'invoices', 'tutor_id', userId);
}

export async function deleteAccountForUser(supabaseAdmin, authUser) {
  const userId = authUser?.id;
  const email = normalizeEmail(authUser?.email);

  if (!userId) {
    throw new Error('Ugyldig bruker.');
  }

  const profile = await runQuery(
    'profile lookup',
    () => supabaseAdmin
      .from('profiles')
      .select('id, email, role, avatar_url')
      .eq('id', userId)
      .maybeSingle(),
    { optional: true }
  );

  const role = profile?.role || authUser?.user_metadata?.role || 'unknown';
  const isStudent = role === 'student' || authUser?.user_metadata?.role === 'student';
  const ownStudentIds = await fetchStudentIdsForUser(supabaseAdmin, userId, email);
  const tutorStudentIds = isStudent ? [] : await fetchStudentIdsForTutor(supabaseAdmin, userId);
  const studentIds = unique([...ownStudentIds, ...tutorStudentIds]);
  const shouldDeleteInvoicesByEmail = isStudent || ownStudentIds.length > 0;

  const storagePaths = await collectStoragePaths(supabaseAdmin, userId, studentIds, profile);

  await removeStorageObjects(supabaseAdmin, 'avatars', storagePaths.avatars);
  await removeStorageObjects(supabaseAdmin, 'resources', storagePaths.resources);
  await removeStorageObjects(supabaseAdmin, 'submissions', storagePaths.submissions);

  await deleteStudentRelatedRows(supabaseAdmin, studentIds, shouldDeleteInvoicesByEmail ? email : '');

  if (!isStudent) {
    await deleteTutorRelatedRows(supabaseAdmin, userId);
  }

  await deleteWhereEq(supabaseAdmin, 'notifications', 'user_id', userId);
  await deleteWhereEq(supabaseAdmin, 'support_feedback', 'user_id', userId);
  await deleteWhereEq(supabaseAdmin, 'profiles', 'id', userId);

  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    console.error('Supabase auth user delete error:', deleteAuthError);
    throw new Error('Kontodata ble ryddet, men Auth-brukeren kunne ikke slettes.');
  }

  return {
    role,
    studentRowsDeleted: studentIds.length,
    storageObjectsQueued: {
      avatars: storagePaths.avatars.length,
      resources: storagePaths.resources.length,
      submissions: storagePaths.submissions.length,
    },
  };
}
