import { Newspaper, Sparkles, ArrowRight } from 'lucide-react';
import { latestRates } from '@/lib/db';
import { portalFeed, latestStories, CITIES } from '@/lib/queries';
import { PortalShell, SectionTitle, portalWorkspace } from '@/components/portal/portal-shell';
import { StoryCard } from '@/components/portal/story-card';
import { MandiWidget } from '@/components/portal/mandi-widget';
import { FilterChips } from '@/components/portal/chips';
import { FadeIn, AutoRefresh } from '@/components/ui/client';
import { EmptyState } from '@/components/ui/empty';
import Link from 'next/link';
import { STATIC, epaperUrl, feedHref } from '@/lib/site';

export const dynamic = 'force-dynamic';

function Sidebar({ wsId }: { wsId: number }) {
  const latest = latestStories(wsId, 8);
  return (
    <aside className="space-y-6 lg:sticky lg:top-32">
      <MandiWidget r={latestRates(wsId)} />
      <a href={epaperUrl()} target="_blank" className="group relative block overflow-hidden rounded-3xl border bg-brand-cream p-5 text-neutral-900 shadow-soft transition hover:shadow-lift">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-red text-white"><Newspaper className="size-5" /></div>
          <div>
            <div className="gu text-lg font-extrabold">આજનું ઈ-પેપર</div>
            <p className="text-sm text-neutral-600">Today&apos;s top stories as a printable front page.</p>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-red">Open cover <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
          </div>
        </div>
      </a>
      <div id="latest" className="scroll-mt-28 rounded-3xl border bg-card p-5 shadow-soft">
        <div className="mb-2 flex items-center justify-between"><div className="gu text-lg font-extrabold">તાજા સમાચાર</div><span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Latest</span></div>
        <ol className="divide-y">
          {latest.map((s, i) => (
            <li key={s.id}><Link href={`/story/${s.id}`} className="group flex gap-3 py-3"><span className="w-5 shrink-0 text-lg font-semibold tabular-nums text-muted-foreground/50">{i + 1}</span><span className="gu line-clamp-2 text-[14px] font-semibold leading-snug group-hover:text-primary">{s.title}</span></Link></li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

export default async function Portal({ searchParams }: { searchParams: Promise<{ focus?: string; city?: string; q?: string }> }) {
  const sp = await searchParams;
  const ws = portalWorkspace();
  const filtered = !!(sp.focus || sp.city || sp.q);
  const agri = portalFeed(ws.id, { focus: 'agri', days: 4, limit: 10 });
  const industry = portalFeed(ws.id, { focus: 'industry', days: 4, limit: 7 });
  const rajkot = portalFeed(ws.id, { city: 'rajkot', days: 7, limit: 6 });
  const lead = agri[0] || industry[0];
  const side = [industry[0], ...rajkot.filter((x) => x.id !== lead?.id)].filter(Boolean).filter((x, i, a) => x.id !== lead?.id && a.findIndex((y) => y.id === x.id) === i).slice(0, 3);
  const shown = new Set([lead?.id, ...side.map((x) => x.id), ...agri.slice(0, 7).map((x) => x.id), ...industry.slice(0, 7).map((x) => x.id), ...rajkot.map((x) => x.id)]);
  const more = filtered ? [] : portalFeed(ws.id, { days: 3, limit: 24 }).filter((x) => !shown.has(x.id)).slice(0, 9);
  const results = filtered ? portalFeed(ws.id, { focus: sp.focus, city: sp.city, q: sp.q, limit: 30 }) : [];
  const cityName = CITIES.find((c) => c.key === sp.city)?.gu;
  const empty = !agri.length && !industry.length;

  return (
    <PortalShell>
      {!STATIC ? <AutoRefresh seconds={120} /> : null}
      {!filtered && lead ? (
        <section className="relative">
          <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60" />
          <div className="container relative grid gap-6 pb-4 pt-6 md:pt-8 lg:grid-cols-12">
            <FadeIn className="lg:col-span-8"><StoryCard s={lead} variant="lead" priority /></FadeIn>
            <div className="flex flex-col gap-4 lg:col-span-4">
              <FadeIn delay={0.05} className="rounded-3xl border bg-card p-4 shadow-soft">
                <div className="mb-2 flex items-center gap-2 px-2 pt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><Sparkles className="size-3.5 text-brand-red" /> ઉદ્યોગ · રાજકોટ</div>
                <div className="space-y-1">{side.map((s) => <StoryCard key={s.id} s={s} variant="compact" />)}</div>
              </FadeIn>
              <FadeIn delay={0.1} className="grid grid-cols-3 gap-3">
                {[['ખેતી', agri.length, 'text-agri'], ['ઉદ્યોગ', industry.length, 'text-industry'], ['રાજકોટ', rajkot.length, 'text-brand-red']].map(([l, n, c]) => (
                  <div key={l as string} className="rounded-2xl border bg-card p-3 text-center shadow-soft"><div className={`text-2xl font-semibold tabular-nums ${c}`}>{n as number}</div><div className="gu text-[12px] text-muted-foreground">{l}</div></div>
                ))}
              </FadeIn>
            </div>
          </div>
        </section>
      ) : null}

      <div id="feed" className="container scroll-mt-28 pt-6"><FilterChips focus={sp.focus || 'all'} city={sp.city || ''} /></div>

      <div className="container mt-8 grid gap-10 lg:grid-cols-12">
        <div className="min-w-0 space-y-14 lg:col-span-8">
          {empty && !filtered ? <EmptyState icon={<Sparkles />} title="Fetching the first live stories…">The pipeline runs every 5 minutes. This page refreshes on its own.</EmptyState> : null}
          {filtered ? (
            <section>
              <SectionTitle kicker={sp.q ? 'Search' : 'Filtered'} title={sp.q ? `“${sp.q}”` : [sp.focus && sp.focus !== 'all' ? ({ agri: 'ખેતી', industry: 'ઉદ્યોગ', rajkot: 'રાજકોટ', general: 'ગુજરાત' } as any)[sp.focus] : '', cityName].filter(Boolean).join(' · ') || 'બધા સમાચાર'} />
              {results.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.map((s, i) => <FadeIn key={s.id} delay={Math.min(i, 8) * 0.03}><StoryCard s={s} className="h-full" /></FadeIn>)}</div>
                : <EmptyState title="No stories match this filter yet">Try another city or category.</EmptyState>}
            </section>
          ) : (
            <>
              {rajkot.length ? (
                <section>
                  <SectionTitle kicker="Rajkot · Saurashtra" title="રાજકોટ અને સૌરાષ્ટ્ર" href={feedHref('', 'rajkot')} />
                  <div className="rounded-3xl border bg-card px-5 shadow-soft">{rajkot.map((s) => <StoryCard key={s.id} s={s} variant="row" />)}</div>
                </section>
              ) : null}
              {agri.length > 1 ? (
                <section>
                  <SectionTitle kicker="Agriculture · APMC" title="ખેતી અને માર્કેટ યાર્ડ" href={feedHref('agri')} tone="agri" />
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{agri.slice(1, 7).map((s, i) => <FadeIn key={s.id} delay={i * 0.04}><StoryCard s={s} className="h-full" /></FadeIn>)}</div>
                </section>
              ) : null}
              {industry.filter((x) => x.id !== side[0]?.id).length ? (
                <section>
                  <SectionTitle kicker="Industry · Business" title="ઉદ્યોગ અને વેપાર" href={feedHref('industry')} tone="industry" />
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{industry.filter((x) => x.id !== side[0]?.id).slice(0, 6).map((s, i) => <FadeIn key={s.id} delay={i * 0.04}><StoryCard s={s} className="h-full" /></FadeIn>)}</div>
                </section>
              ) : null}
              {more.length ? (
                <section>
                  <SectionTitle kicker="All categories · Gujarat" title="બધા સમાચાર" href={feedHref('general')} />
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{more.map((s, i) => <FadeIn key={s.id} delay={i * 0.04}><StoryCard s={s} className="h-full" /></FadeIn>)}</div>
                </section>
              ) : null}
            </>
          )}
        </div>
        <div className="lg:col-span-4"><Sidebar wsId={ws.id} /></div>
      </div>
    </PortalShell>
  );
}
