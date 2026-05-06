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
  'subscription_changed',
  'subscription_cancelled',
  'plan_limit_reached',
  'upgrade_clicked',
] as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENT_NAMES[number];

type MetadataValue = string | number | boolean | null | undefined;
type AnalyticsMetadata = Record<string, MetadataValue>;

const ANALYTICS_EVENT_SET = new Set<string>(ANALYTICS_EVENT_NAMES);
const SAFE_METADATA_KEYS = new Set([
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
  'visitor_id',
]);

const VISITOR_ID_KEY = 'tutorflyt_visitor_id';
let runtimeVisitorId: string | null = null;

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

const createVisitorId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

const getAnonymousVisitorId = () => {
  if (runtimeVisitorId) return runtimeVisitorId;

  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) {
      runtimeVisitorId = existing;
      return existing;
    }

    const visitorId = createVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
    runtimeVisitorId = visitorId;
    return visitorId;
  } catch (error) {
    runtimeVisitorId = runtimeVisitorId || createVisitorId();
    return runtimeVisitorId;
  }
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

export const trackEvent = trackAnalyticsEvent;

export async function trackPageView(pathname: string) {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return;

  const route = normalizeRoute(pathname);
  const metadata = {
    route,
    area: getRouteArea(route),
    visitor_id: getAnonymousVisitorId(),
  };

  try {
    const response = await fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
      keepalive: true,
    });

    if (response.ok) return;
  } catch (error) {
    // Fall back to direct Supabase insert below.
  }

  await trackAnalyticsEvent('page_view', metadata, { anonymous: true });
}
