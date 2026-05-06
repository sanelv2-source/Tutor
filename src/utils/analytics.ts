import { supabase } from '../supabaseClient';

export const ANALYTICS_EVENT_NAMES = [
  'page_view',
  'signup_completed',
  'onboarding_completed',
  'student_created',
  'lesson_created',
  'invoice_created',
  'calendar_connected',
  'subscription_started',
] as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENT_NAMES[number];

type MetadataValue = string | number | boolean | null | undefined;
type AnalyticsMetadata = Record<string, MetadataValue>;

const ANALYTICS_EVENT_SET = new Set<string>(ANALYTICS_EVENT_NAMES);
const SAFE_METADATA_KEYS = new Set([
  'area',
  'has_first_student',
  'method',
  'plan',
  'provider',
  'role',
  'route',
  'source',
]);

const normalizeRoute = (pathname: string) => {
  if (/^\/invoice\/[^/]+/.test(pathname)) return '/invoice/:publicToken';
  if (pathname.startsWith('/student/accept-invite')) return '/student/accept-invite';
  if (pathname.startsWith('/student')) return '/student';
  if (pathname.startsWith('/tutor')) return '/tutor';
  if (pathname.startsWith('/reset-password')) return '/reset-password';
  return pathname || '/';
};

const getRouteArea = (route: string) => {
  if (route.startsWith('/tutor')) return 'tutor_app';
  if (route.startsWith('/student')) return 'student_app';
  if (route.startsWith('/invoice')) return 'public_invoice';
  return 'public_site';
};

const sanitizeMetadata = (metadata: AnalyticsMetadata = {}) => {
  return Object.entries(metadata).reduce<Record<string, string | number | boolean>>((safe, [key, value]) => {
    if (!SAFE_METADATA_KEYS.has(key) || value === null || value === undefined) return safe;
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

export async function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  metadata: AnalyticsMetadata = {},
  options: { anonymous?: boolean; userId?: string | null } = {}
) {
  if (!ANALYTICS_EVENT_SET.has(eventName)) return;

  try {
    let userId = options.anonymous ? null : options.userId ?? null;

    if (!options.anonymous && !userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const { error } = await supabase
      .from('analytics_events')
      .insert({
        user_id: userId,
        event_name: eventName,
        metadata: sanitizeMetadata(metadata),
      });

    if (error && !/analytics_events|schema cache|relation/i.test(error.message || '')) {
      console.warn('Analytics event was not recorded:', error.message);
    }
  } catch (error) {
    console.warn('Analytics event failed:', error);
  }
}

export async function trackPageView(pathname: string) {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return;

  const route = normalizeRoute(pathname);
  await trackAnalyticsEvent(
    'page_view',
    {
      route,
      area: getRouteArea(route),
    },
    { anonymous: true }
  );
}
