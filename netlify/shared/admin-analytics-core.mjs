export const ADMIN_ANALYTICS_EVENTS = [
  'page_view',
  'signup_completed',
  'onboarding_completed',
  'student_created',
  'lesson_created',
  'invoice_created',
  'calendar_connected',
  'subscription_started',
  'subscription_changed',
  'subscription_cancelled',
  'plan_limit_reached',
  'upgrade_clicked',
];

export const ADMIN_EMAIL = 'info@tutorflyt.no';

const PLAN_KEYS = ['free', 'start', 'pro', 'premium'];
const SAFE_ADMIN_METADATA_KEYS = new Set([
  'area',
  'current_count',
  'feature',
  'has_first_student',
  'limit',
  'max_allowed',
  'method',
  'plan',
  'provider',
  'role',
  'route',
  'source',
  'target_plan',
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

const normalizePlan = (plan, subscriptionStatus = null, role = null) => {
  if (role === 'admin') return 'premium';
  if (PLAN_KEYS.includes(plan)) return plan;
  if (subscriptionStatus === 'active') return 'pro';
  return 'free';
};

const sanitizeMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};

  return Object.entries(metadata).reduce((safe, [key, value]) => {
    if (!SAFE_ADMIN_METADATA_KEYS.has(key) || value === null || value === undefined) return safe;
    if (typeof value === 'boolean' || typeof value === 'number') {
      safe[key] = value;
      return safe;
    }
    if (typeof value === 'string') {
      safe[key] = value.slice(0, 120);
    }
    return safe;
  }, {});
};

const incrementByKey = (map, key) => {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
};

const getVisitorId = (event) => {
  const visitorId = event?.metadata?.visitor_id;
  return typeof visitorId === 'string' && visitorId.trim() ? visitorId.trim() : null;
};

const getCountry = (event) => {
  const code = typeof event?.metadata?.country_code === 'string' ? event.metadata.country_code.trim().toUpperCase() : '';
  const name = typeof event?.metadata?.country_name === 'string' ? event.metadata.country_name.trim() : '';

  return {
    key: code || 'unknown',
    countryCode: code || null,
    countryName: name || code || 'Ukjent',
  };
};

export async function getAdminAnalyticsSummary(supabaseAdmin) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [profiles, students, lessons, invoices, events] = await Promise.all([
    selectRows(
      supabaseAdmin,
      'profiles',
      'id, email, full_name, role, plan, subscription_status, created_at',
      'id, email, full_name, role, subscription_status, created_at'
    ),
    selectRows(supabaseAdmin, 'students', 'id, tutor_id, created_at', 'id, tutor_id'),
    selectRows(supabaseAdmin, 'lessons', 'id, tutor_id, created_at', 'id, tutor_id'),
    selectRows(supabaseAdmin, 'invoices', 'id, tutor_id, created_at', 'id, tutor_id'),
    selectRows(supabaseAdmin, 'analytics_events', 'event_name, user_id, metadata, created_at', 'event_name, user_id, created_at'),
  ]);

  const tutorProfiles = profiles.filter((profile) => profile.role === 'tutor');
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const planCounts = Object.fromEntries(PLAN_KEYS.map((plan) => [plan, 0]));
  const studentsByTutor = new Map();
  const lessonsByTutor = new Map();
  const invoicesByTutor = new Map();
  const lastActivityByUser = new Map();

  tutorProfiles.forEach((profile) => {
    planCounts[normalizePlan(profile.plan, profile.subscription_status, profile.role)] += 1;
  });

  students.forEach((student) => incrementByKey(studentsByTutor, student.tutor_id));
  lessons.forEach((lesson) => incrementByKey(lessonsByTutor, lesson.tutor_id));
  invoices.forEach((invoice) => incrementByKey(invoicesByTutor, invoice.tutor_id));

  const paidUsers = planCounts.start + planCounts.pro + planCounts.premium;
  const freeUsers = planCounts.free;
  const newUsers7d = profiles.filter((profile) => {
    const createdAt = parseDate(profile.created_at);
    return createdAt && createdAt >= sevenDaysAgo;
  }).length;

  const eventCounts = countByEventName(events);
  const activeUserIds = new Set();
  const firstStudentUserIds = new Set();
  const firstLessonUserIds = new Set();
  const visitorIds = new Set();
  const visitorIds7d = new Set();
  const visitorIdsToday = new Set();
  const countryStats = new Map();
  let pageViews7d = 0;
  let pageViewsToday = 0;

  events.forEach((event) => {
    const createdAt = parseDate(event.created_at);

    if (event.event_name === 'page_view') {
      const visitorId = getVisitorId(event);
      const country = getCountry(event);
      const countryEntry = countryStats.get(country.key) || {
        countryCode: country.countryCode,
        countryName: country.countryName,
        pageViews: 0,
        visitorIds: new Set(),
      };

      countryEntry.pageViews += 1;
      if (visitorId) countryEntry.visitorIds.add(visitorId);
      countryStats.set(country.key, countryEntry);

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
    if (event.user_id && createdAt) {
      const previous = lastActivityByUser.get(event.user_id);
      if (!previous || createdAt > previous) lastActivityByUser.set(event.user_id, createdAt);
    }
    if (event.user_id && event.event_name === 'student_created') {
      firstStudentUserIds.add(event.user_id);
    }
    if (event.user_id && event.event_name === 'lesson_created') {
      firstLessonUserIds.add(event.user_id);
    }
  });

  const activatedTutors = tutorProfiles.filter((profile) =>
    (studentsByTutor.get(profile.id) || 0) > 0 &&
    (lessonsByTutor.get(profile.id) || 0) > 0
  );
  const paidFunnelCount = Math.max(eventCounts.subscription_started, paidUsers);
  const firstStudentCount = new Set(students.map((student) => student.tutor_id).filter(Boolean)).size || firstStudentUserIds.size || eventCounts.student_created;
  const firstLessonCount = new Set(lessons.map((lesson) => lesson.tutor_id).filter(Boolean)).size || firstLessonUserIds.size || eventCounts.lesson_created;
  const visitorCountries = Array.from(countryStats.values())
    .map((entry) => ({
      countryCode: entry.countryCode,
      countryName: entry.countryName,
      pageViews: entry.pageViews,
      visitors: entry.visitorIds.size,
    }))
    .sort((a, b) => b.pageViews - a.pageViews || b.visitors - a.visitors)
    .slice(0, 12);
  const users = tutorProfiles
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name || null,
      email: profile.email || null,
      plan: normalizePlan(profile.plan, profile.subscription_status, profile.role),
      createdAt: profile.created_at || null,
      lastActivityAt: lastActivityByUser.get(profile.id)?.toISOString() || null,
      studentCount: studentsByTutor.get(profile.id) || 0,
      lessonCount: lessonsByTutor.get(profile.id) || 0,
    }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, 100);
  const recentEvents = [...events]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 40)
    .map((event) => {
      const profile = event.user_id ? profileById.get(event.user_id) : null;
      return {
        createdAt: event.created_at || null,
        eventName: event.event_name,
        plan: profile ? normalizePlan(profile.plan, profile.subscription_status, profile.role) : normalizePlan(event.metadata?.plan),
        metadata: sanitizeMetadata(event.metadata),
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      totalUsers: profiles.length,
      totalTutors: tutorProfiles.length,
      newUsers7d,
      activeUsers7d: activeUserIds.size,
      activatedUsers: activatedTutors.length,
      activationRate: percentage(activatedTutors.length, tutorProfiles.length),
      totalStudents: students.length,
      totalLessons: lessons.length,
      totalInvoices: invoices.length,
      freeUsers,
      startUsers: planCounts.start,
      proUsers: planCounts.pro,
      premiumUsers: planCounts.premium,
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
    planDistribution: PLAN_KEYS.map((plan) => ({ plan, count: planCounts[plan] || 0 })),
    users,
    recentEvents,
    visitorCountries,
    events: ADMIN_ANALYTICS_EVENTS.map((eventName) => ({
      eventName,
      count: eventCounts[eventName] || 0,
    })),
  };
}
