export type SubscriptionPlan = 'free' | 'start' | 'pro' | 'premium';

export type PlanLimitValue = number | null;

export type PlanLimits = {
  maxStudents: PlanLimitValue;
  maxLessonsPerMonth: PlanLimitValue;
  maxInvoicesPerMonth: PlanLimitValue;
  adsEnabled: boolean;
  advancedReports: boolean;
  aiAssistant: boolean;
};

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxStudents: 3,
    maxLessonsPerMonth: 10,
    maxInvoicesPerMonth: 3,
    adsEnabled: true,
    advancedReports: false,
    aiAssistant: false,
  },
  start: {
    maxStudents: 5,
    maxLessonsPerMonth: 25,
    maxInvoicesPerMonth: 5,
    adsEnabled: false,
    advancedReports: false,
    aiAssistant: false,
  },
  pro: {
    maxStudents: 20,
    maxLessonsPerMonth: null,
    maxInvoicesPerMonth: null,
    adsEnabled: false,
    advancedReports: true,
    aiAssistant: false,
  },
  premium: {
    maxStudents: null,
    maxLessonsPerMonth: null,
    maxInvoicesPerMonth: null,
    adsEnabled: false,
    advancedReports: true,
    aiAssistant: true,
  },
};

export const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  free: 'Gratis',
  start: 'Start',
  pro: 'Pro',
  premium: 'Premium',
};

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  start: 59,
  pro: 129,
  premium: 249,
};

export const PLAN_ORDER: SubscriptionPlan[] = ['free', 'start', 'pro', 'premium'];

export const normalizePlan = (plan?: string | null): SubscriptionPlan => {
  if (plan === 'start' || plan === 'pro' || plan === 'premium') return plan;
  return 'free';
};

const isWithinLimit = (limit: PlanLimitValue, currentCount: number) => {
  if (limit === null) return true;
  return currentCount < limit;
};

export const canCreateStudent = (userPlan: string | null | undefined, currentStudentCount: number) => {
  return isWithinLimit(PLAN_LIMITS[normalizePlan(userPlan)].maxStudents, currentStudentCount);
};

export const canCreateLesson = (userPlan: string | null | undefined, currentMonthlyLessonCount: number) => {
  return isWithinLimit(PLAN_LIMITS[normalizePlan(userPlan)].maxLessonsPerMonth, currentMonthlyLessonCount);
};

export const canCreateInvoice = (userPlan: string | null | undefined, currentMonthlyInvoiceCount: number) => {
  return isWithinLimit(PLAN_LIMITS[normalizePlan(userPlan)].maxInvoicesPerMonth, currentMonthlyInvoiceCount);
};

export const shouldShowAds = (userPlan: string | null | undefined) => {
  return PLAN_LIMITS[normalizePlan(userPlan)].adsEnabled;
};

export const getPlanLimit = (
  userPlan: string | null | undefined,
  limitKey: keyof Pick<PlanLimits, 'maxStudents' | 'maxLessonsPerMonth' | 'maxInvoicesPerMonth'>
) => PLAN_LIMITS[normalizePlan(userPlan)][limitKey];

export const getUpgradeMessage = (
  userPlan: string | null | undefined,
  limitName: 'students' | 'lessons' | 'invoices'
) => {
  const planName = PLAN_NAMES[normalizePlan(userPlan)];

  if (limitName === 'students') {
    return `Du har nådd grensen for ${planName}-planen. Oppgrader til Start eller Pro for flere elever.`;
  }

  if (limitName === 'lessons') {
    return `Du har nådd timegrensen for ${planName}-planen denne måneden. Oppgrader for flere timer.`;
  }

  return `Du har nådd fakturagrensen for ${planName}-planen denne måneden. Oppgrader for flere fakturaer.`;
};
