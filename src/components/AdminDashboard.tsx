import React from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CreditCard,
  Lock,
  LogOut,
  MousePointerClick,
  PieChart,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import Logo from './Logo';
import { supabase } from '../supabaseClient';
import { PLAN_NAMES, type SubscriptionPlan } from '../lib/plans';

type AdminSummary = {
  generatedAt: string;
  metrics: {
    totalUsers: number;
    newUsers7d: number;
    activeUsers7d: number;
    activatedUsers: number;
    activationRate: number;
    totalStudents: number;
    totalLessons: number;
    totalInvoices: number;
    freeUsers: number;
    startUsers: number;
    proUsers: number;
    premiumUsers: number;
    paidUsers: number;
    totalPageViews: number;
    pageViews7d: number;
    pageViewsToday: number;
    uniqueVisitors: number;
    visitors7d: number;
    visitorsToday: number;
  };
  funnel: Array<{ key: string; label: string; value: number }>;
  featureUsage: Array<{ key: string; label: string; value: number; events: number }>;
  planDistribution: Array<{ plan: SubscriptionPlan; count: number }>;
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    plan: SubscriptionPlan;
    createdAt: string | null;
    lastActivityAt: string | null;
    studentCount: number;
    lessonCount: number;
  }>;
  recentEvents: Array<{
    createdAt: string | null;
    eventName: string;
    plan: SubscriptionPlan;
    metadata: Record<string, string | number | boolean>;
  }>;
  visitorCountries: Array<{
    countryCode: string | null;
    countryName: string;
    visitors: number;
    pageViews: number;
  }>;
};

const numberFormatter = new Intl.NumberFormat('no-NO');

const formatNumber = (value: number) => numberFormatter.format(value || 0);
const formatPercent = (value: number) => `${numberFormatter.format(value || 0)} %`;
const formatDateTime = (value: string | null) => {
  if (!value) return 'Ingen aktivitet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Ukjent' : date.toLocaleString('no-NO');
};
const formatPlanName = (plan: SubscriptionPlan) => PLAN_NAMES[plan] || plan;

function useNoIndex() {
  React.useEffect(() => {
    const previousRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousContent = previousRobots?.getAttribute('content') || null;
    const robots = previousRobots || document.createElement('meta');

    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex,nofollow');
    if (!previousRobots) document.head.appendChild(robots);

    return () => {
      if (previousRobots && previousContent) {
        previousRobots.setAttribute('content', previousContent);
      } else if (!previousRobots) {
        robots.remove();
      }
    };
  }, []);
}

function MetricCard({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  useNoIndex();

  const [summary, setSummary] = React.useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadSummary = React.useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = data.session?.access_token;
      if (!token) throw new Error('Du må være logget inn som admin.');

      const response = await fetch('/api/admin/analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Kunne ikke hente admin-data.');
      }

      setSummary(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente admin-data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const metricCards = summary
    ? [
        {
          label: 'Besøkende',
          value: formatNumber(summary.metrics.uniqueVisitors),
          detail: 'Unike anonyme nettlesere',
          Icon: Users,
        },
        {
          label: 'Besøkende siste 7 dager',
          value: formatNumber(summary.metrics.visitors7d),
          detail: `${formatNumber(summary.metrics.pageViews7d)} sidevisninger`,
          Icon: TrendingUp,
        },
        {
          label: 'Besøk i dag',
          value: formatNumber(summary.metrics.pageViewsToday),
          detail: `${formatNumber(summary.metrics.visitorsToday)} unike besøkende`,
          Icon: MousePointerClick,
        },
        {
          label: 'Totale brukere',
          value: formatNumber(summary.metrics.totalUsers),
          detail: 'Alle roller samlet',
          Icon: Users,
        },
        {
          label: 'Nye brukere',
          value: formatNumber(summary.metrics.newUsers7d),
          detail: 'Siste 7 dager',
          Icon: TrendingUp,
        },
        {
          label: 'Aktive brukere',
          value: formatNumber(summary.metrics.activeUsers7d),
          detail: 'Brukere med interne events siste 7 dager',
          Icon: Activity,
        },
        {
          label: 'Aktiverte brukere',
          value: formatNumber(summary.metrics.activatedUsers),
          detail: 'Minst 1 elev og minst 1 time',
          Icon: UserCheck,
        },
        {
          label: 'Aktiveringsrate',
          value: formatPercent(summary.metrics.activationRate),
          detail: 'Aktiverte av alle lærere',
          Icon: BarChart3,
        },
        {
          label: 'Elever opprettet',
          value: formatNumber(summary.metrics.totalStudents),
          detail: 'Aggregert antall elever',
          Icon: Users,
        },
        {
          label: 'Timer opprettet',
          value: formatNumber(summary.metrics.totalLessons),
          detail: 'Aggregert antall timer',
          Icon: CalendarDays,
        },
        {
          label: 'Gratisbrukere',
          value: formatNumber(summary.metrics.freeUsers),
          detail: 'Free-plan med sponsorvisning',
          Icon: Lock,
        },
        {
          label: 'Startbrukere',
          value: formatNumber(summary.metrics.startUsers),
          detail: 'Lav terskel for betaling',
          Icon: CreditCard,
        },
        {
          label: 'Probrukere',
          value: formatNumber(summary.metrics.proUsers),
          detail: 'Anbefalt hovedpakke',
          Icon: TrendingUp,
        },
        {
          label: 'Premiumbrukere',
          value: formatNumber(summary.metrics.premiumUsers),
          detail: 'Seriøse privatlærere',
          Icon: PieChart,
        },
        {
          label: 'Betalte brukere',
          value: formatNumber(summary.metrics.paidUsers),
          detail: 'Lærere med aktivt abonnement',
          Icon: CreditCard,
        },
        {
          label: 'Fakturaer opprettet',
          value: formatNumber(summary.metrics.totalInvoices),
          detail: 'Aggregert antall fakturaer',
          Icon: CreditCard,
        },
      ]
    : [];

  const maxFunnelValue = Math.max(...(summary?.funnel.map((step) => step.value) || [0]), 1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <Logo iconSize="w-11 h-11 text-2xl" textSize="text-xl" />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">Admin</h1>
              <p className="mt-1 text-sm text-slate-500">Aggregerte produktmålinger for Tutorflyt.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadSummary}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Oppdater
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Logg ut
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading && (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {!isLoading && summary && (
          <div className="space-y-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Sist oppdatert {new Date(summary.generatedAt).toLocaleString('no-NO')}
              </p>
              <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">
                Kun aggregerte tall. Ingen elevnotater eller sensitive persondata vises.
              </p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metricCards.map((card) => (
                <MetricCard key={card.label} {...card} />
              ))}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Funnel</h2>
                  <p className="mt-1 text-sm text-slate-500">Besøk → registrering → første elev → første time → betalt</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-5">
                {summary.funnel.map((step, index) => {
                  const previous = index === 0 ? step.value : summary.funnel[index - 1]?.value || 0;
                  const conversion = index === 0 ? 100 : Math.min(100, previous ? (step.value / previous) * 100 : 0);
                  const width = Math.max(4, Math.round((step.value / maxFunnelValue) * 100));

                  return (
                    <div key={step.key} className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-slate-700">{step.label}</p>
                        <p className="text-sm font-black text-slate-950">{formatNumber(step.value)}</p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-teal-600" style={{ width: `${width}%` }} />
                      </div>
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {index === 0 ? 'Startpunkt' : `${formatPercent(conversion)} fra forrige steg`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Kjernefunksjoner</h2>
              <div className="mt-5 divide-y divide-slate-100">
                {summary.featureUsage.map((feature) => (
                  <div key={feature.key} className="grid gap-3 py-4 sm:grid-cols-3 sm:items-center">
                    <p className="font-bold text-slate-800">{feature.label}</p>
                    <p className="text-sm text-slate-500">Totalt: {formatNumber(feature.value)}</p>
                    <p className="text-sm text-slate-500">Trackede events: {formatNumber(feature.events)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Planfordeling</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summary.planDistribution.map((item) => (
                  <div key={item.plan} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-500">{formatPlanName(item.plan)}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{formatNumber(item.count)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-slate-950">Brukere</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Navn/e-post vises kun for lærerprofilene. Elevnotater og privat elevdata hentes ikke.
                </p>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 pr-4">Bruker</th>
                      <th className="py-3 pr-4">Plan</th>
                      <th className="py-3 pr-4">Registrert</th>
                      <th className="py-3 pr-4">Siste aktivitet</th>
                      <th className="py-3 pr-4 text-right">Elever</th>
                      <th className="py-3 text-right">Timer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-5 text-slate-500">Ingen lærerbrukere funnet.</td>
                      </tr>
                    ) : (
                      summary.users.map((row) => (
                        <tr key={row.id}>
                          <td className="py-4 pr-4">
                            <p className="font-bold text-slate-800">{row.name || 'Uten navn'}</p>
                            <p className="text-xs text-slate-500">{row.email || 'Mangler e-post'}</p>
                          </td>
                          <td className="py-4 pr-4 font-semibold text-slate-700">{formatPlanName(row.plan)}</td>
                          <td className="py-4 pr-4 text-slate-500">{formatDateTime(row.createdAt)}</td>
                          <td className="py-4 pr-4 text-slate-500">{formatDateTime(row.lastActivityAt)}</td>
                          <td className="py-4 pr-4 text-right font-bold text-slate-800">{formatNumber(row.studentCount)}</td>
                          <td className="py-4 text-right font-bold text-slate-800">{formatNumber(row.lessonCount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-slate-950">Aktivitet</h2>
                <p className="mt-1 text-sm text-slate-500">Siste interne analytics-events med renset metadata.</p>
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                {summary.recentEvents.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">Ingen events registrert ennå.</p>
                ) : (
                  summary.recentEvents.map((event, index) => (
                    <div key={`${event.createdAt}-${event.eventName}-${index}`} className="grid gap-3 py-4 lg:grid-cols-[180px_1fr_120px_2fr] lg:items-start">
                      <p className="text-sm text-slate-500">{formatDateTime(event.createdAt)}</p>
                      <p className="font-bold text-slate-800">{event.eventName}</p>
                      <p className="text-sm font-semibold text-slate-600">{formatPlanName(event.plan)}</p>
                      <code className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                        {JSON.stringify(event.metadata, null, 2)}
                      </code>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Besøkende etter land</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Aggregert fra Netlify geodata. IP, koordinater og postnummer lagres ikke.
                  </p>
                </div>
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                {summary.visitorCountries.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">Ingen geografidata registrert ennå.</p>
                ) : (
                  summary.visitorCountries.map((country) => (
                    <div key={country.countryCode || country.countryName} className="grid gap-3 py-4 sm:grid-cols-4 sm:items-center">
                      <p className="font-bold text-slate-800">
                        {country.countryName}
                        {country.countryCode && <span className="ml-2 text-xs font-semibold text-slate-400">{country.countryCode}</span>}
                      </p>
                      <p className="text-sm text-slate-500">Besøkende: {formatNumber(country.visitors)}</p>
                      <p className="text-sm text-slate-500">Sidevisninger: {formatNumber(country.pageViews)}</p>
                      <p className="text-sm text-slate-500">
                        {country.visitors > 0 ? `${formatNumber(Math.round((country.pageViews / country.visitors) * 10) / 10)} sider per besøkende` : 'Mangler visitor-id'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
