export const ADMIN_ANALYTICS_EVENTS = [
  'page_view',
  'signup_completed',
  'onboarding_completed',
  'student_created',
  'lesson_created',
  'invoice_created',
  'calendar_connected',
  'subscription_started',
];

export const ADMIN_EMAIL = 'info@tutorflyt.no';

const ACTIVATION_EVENTS = new Set([
  'onboarding_completed',
  'student_created',
  'lesson_created',
]);

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const getBearerToken = (value) => String(value ?? '').replace(/^Bearer\s+/i, '').trim();

export async function requireAdminUser(supabaseAdmin, token) {
  if (!token) {
    throw createHttpError(401, 'Du må være logget inn for å se adminpanelet.');
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    throw createHttpError(401, 'Ugyldig eller utløpt innlogging.');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, force_password_change')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Admin profile lookup error:', profileError);
    throw createHttpError(500, 'Kunne ikke verifisere admin-rolle.');
  }

  const authEmail = String(authData.user.email || '').trim().toLowerCase();
  const profileEmail = String(profile?.email || '').trim().toLowerCase();

  if (authEmail !== ADMIN_EMAIL || (profileEmail && profileEmail !== ADMIN_EMAIL) || profile?.role !== 'admin') {
    throw createHttpError(403, 'Du har ikke tilgang til adminpanelet.');
  }

  if (profile?.force_password_change) {
    throw createHttpError(428, 'Admin-passordet må endres før adminpanelet kan brukes.');
  }

  return { user: authData.user, profile };
}

async function selectRows(supabaseAdmin, tableName, columns, fallbackColumns = null) {
  const run = async (selectedColumns) => {
    const { data, error } = await supabaseAdmin.from(tableName).select(selectedColumns);
    return { data: data || [], error };
  };

  const result = await run(columns);
  if (!result.error) return result.data;

  if (fallbackColumns && /column|schema cache|Could not find/i.test(result.error.message || '')) {
    const fallback = await run(fallbackColumns);
    if (!fallback.error) return fallback.data;
  }

  console.error(`Admin analytics lookup failed for ${tableName}:`, result.error);
  return [];
}

const parseDate = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? null : date;
};

const percentage = (part, total) => {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
};

const countByEventName = (events) => {
  const counts = Object.fromEntries(ADMIN_ANALYTICS_EVENTS.map((eventName) => [eventName, 0]));
  events.forEach((event) => {
    if (counts[event.event_name] !== undefined) {
      counts[event.event_name] += 1;
    }
  });
  return counts;
};

const getVisitorId = (event) => {
  const visitorId = event?.metadata?.visitor_id;
  return typeof visitorId === 'string' && visitorId.trim() ? visitorId.trim() : null;
};

export async function getAdminAnalyticsSummary(supabaseAdmin) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [profiles, students, lessons, invoices, events] = await Promise.all([
    selectRows(supabaseAdmin, 'profiles', 'id, role, subscription_status, created_at', 'id, role, subscription_status'),
    selectRows(supabaseAdmin, 'students', 'id, tutor_id, created_at', 'id, tutor_id'),
    selectRows(supabaseAdmin, 'lessons', 'id, tutor_id, created_at', 'id, tutor_id'),
    selectRows(supabaseAdmin, 'invoices', 'id, tutor_id, created_at', 'id, tutor_id'),
    selectRows(supabaseAdmin, 'analytics_events', 'event_name, user_id, metadata, created_at', 'event_name, user_id, created_at'),
  ]);

  const tutorProfiles = profiles.filter((profile) => profile.role === 'tutor');
  const paidUsers = tutorProfiles.filter((profile) => profile.subscription_status === 'active').length;
  const freeUsers = Math.max(tutorProfiles.length - paidUsers, 0);
  const newUsers7d = profiles.filter((profile) => {
    const createdAt = parseDate(profile.created_at);
    return createdAt && createdAt >= sevenDaysAgo;
  }).length;

  const eventCounts = countByEventName(events);
  const activeUserIds = new Set();
  const activatedUserIds = new Set();
  const firstStudentUserIds = new Set();
  const firstLessonUserIds = new Set();
  const visitorIds = new Set();
  const visitorIds7d = new Set();
  const visitorIdsToday = new Set();
  let pageViews7d = 0;
  let pageViewsToday = 0;

  events.forEach((event) => {
    const createdAt = parseDate(event.created_at);

    if (event.event_name === 'page_view') {
      const visitorId = getVisitorId(event);
      if (visitorId) visitorIds.add(visitorId);
      if (createdAt && createdAt >= sevenDaysAgo) {
        pageViews7d += 1;
        if (visitorId) visitorIds7d.add(visitorId);
      }
      if (createdAt && createdAt >= todayStart) {
        pageViewsToday += 1;
        if (visitorId) visitorIdsToday.add(visitorId);
      }
    }

    if (event.user_id && createdAt && createdAt >= sevenDaysAgo) {
      activeUserIds.add(event.user_id);
    }
    if (event.user_id && ACTIVATION_EVENTS.has(event.event_name)) {
      activatedUserIds.add(event.user_id);
    }
    if (event.user_id && event.event_name === 'student_created') {
      firstStudentUserIds.add(event.user_id);
    }
    if (event.user_id && event.event_name === 'lesson_created') {
      firstLessonUserIds.add(event.user_id);
    }
  });

  students.forEach((student) => {
    if (student.tutor_id) activatedUserIds.add(student.tutor_id);
  });

  lessons.forEach((lesson) => {
    if (lesson.tutor_id) activatedUserIds.add(lesson.tutor_id);
  });

  const paidFunnelCount = Math.max(eventCounts.subscription_started, paidUsers);
  const firstStudentCount = firstStudentUserIds.size || eventCounts.student_created;
  const firstLessonCount = firstLessonUserIds.size || eventCounts.lesson_created;

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      totalUsers: profiles.length,
      totalTutors: tutorProfiles.length,
      newUsers7d,
      activeUsers7d: activeUserIds.size,
      activatedUsers: activatedUserIds.size,
      activationRate: percentage(activatedUserIds.size, tutorProfiles.length),
      totalStudents: students.length,
      totalLessons: lessons.length,
      totalInvoices: invoices.length,
      freeUsers,
      paidUsers,
      totalPageViews: eventCounts.page_view,
      pageViews7d,
      pageViewsToday,
      uniqueVisitors: visitorIds.size,
      visitors7d: visitorIds7d.size,
      visitorsToday: visitorIdsToday.size,
    },
    funnel: [
      { key: 'visits', label: 'Besøk', value: eventCounts.page_view },
      { key: 'signup', label: 'Registrering', value: eventCounts.signup_completed },
      { key: 'first_student', label: 'Første elev', value: firstStudentCount },
      { key: 'first_lesson', label: 'Første time', value: firstLessonCount },
      { key: 'paid', label: 'Betalt', value: paidFunnelCount },
    ],
    featureUsage: [
      { key: 'students', label: 'Elever', value: students.length, events: eventCounts.student_created },
      { key: 'lessons', label: 'Timer', value: lessons.length, events: eventCounts.lesson_created },
      { key: 'calendar', label: 'Kalender', value: eventCounts.calendar_connected, events: eventCounts.calendar_connected },
      { key: 'billing', label: 'Fakturering', value: invoices.length, events: eventCounts.invoice_created },
    ],
    events: ADMIN_ANALYTICS_EVENTS.map((eventName) => ({
      eventName,
      count: eventCounts[eventName] || 0,
    })),
  };
}
