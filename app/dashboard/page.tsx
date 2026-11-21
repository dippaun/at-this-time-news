/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Rss, Sprout, Factory, Clock, Sparkles, Workflow, ArrowRight, Newspaper, Images, AlertTriangle } from 'lucide-react';
import { getSession, currentWsId, can } from '@/lib/auth';
import { getWorkspace, latestRates } from '@/lib/db';
import { stats, listPosts, recentRuns, activity, timeAgo, fmtTime, series, templateCounts } from '@/lib/queries';
import { aiStatus } from '@/lib/summarize';
import { FetchNow } from '@/components/dash/fetch-now';
import { KpiCard } from '@/components/dash/kpi';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty';
import { buttonClass } from '@/components/ui/button';
import { MandiWidget } from '@/components/portal/mandi-widget';
import { AutoRefresh, FadeIn } from '@/components/ui/client';
export const dynamic = 'force-dynamic';

const LV: Record<string, string> = { info: 'bg-muted-foreground/40', warn: 'bg-amber-500', error: 'bg-rose-500', success: 'bg-emerald-500' };

export default async function Overview() {
  const s = await getSession();
  const wsId = await currentWsId();
  const ws = getWorkspace(wsId)!;
  const st = stats(wsId);
  const sr = series(wsId, 24);
  const tc = templateCounts(wsId);
  const posts = listPosts(wsId, 'pending', 4);
  const runs = recentRuns(wsId, 6);
  const log = activity(wsId, 10);
  const ai = aiStatus({ provider: ws.settings.aiProvider });
  const aiPct = st.posts ? Math.round((st.ai / st.posts) * 100) : 0;
  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date()));
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="space-y-6">
      <AutoRefresh seconds={45} />
      <PageHeader eyebrow={ws.name} title={`${greet}, ${s!.name.split(' ')[0]}`} description="Live Gujarat news → Gemini summary → AT THIS TIME frames → your approval. Agriculture first, industry second." actions={<FetchNow canRun={can(s, 'editor')} />} />

      {!ai.available ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div><b>No AI provider is active right now.</b> {ai.lastError ? <span className="font-mono text-xs">{ai.lastError}</span> : 'GEMINI_API_KEY is not configured.'} Posts use the built-in extractive summariser until a provider is back.</div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Stories" value={st.items} sub={`${st.items24} in the last 24h`} data={sr.items} icon={<Rss />} color="hsl(var(--foreground))" />
        <KpiCard label="Agriculture" value={st.agri} sub="Primary focus" data={sr.agri} icon={<Sprout />} color="hsl(var(--agri))" />
        <KpiCard label="Industry" value={st.industry} sub="Second focus" data={sr.industry} icon={<Factory />} color="hsl(var(--industry))" />
        <KpiCard label="Pending" value={st.pending} sub={`${st.approved} approved · ${st.rejected} rejected`} data={sr.pending} icon={<Clock />} color="#f59e0b" />
        <KpiCard label="AI summaries" value={`${aiPct}%`} sub={`${st.ai} of ${st.posts} posts`} data={sr.ai} icon={<Sparkles />} color="#0ea5e9" />
        <KpiCard label="Posts framed" value={st.posts} sub={`${st.runs} runs · ${st.sources} sources`} data={sr.posts} icon={<Workflow />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div><CardTitle>Up next for review</CardTitle><CardDescription>Highest-priority pending frames</CardDescription></div>
            <Link href="/dashboard/queue" className={buttonClass('outline', 'sm')}>Open queue <ArrowRight /></Link>
          </CardHeader>
          <CardContent>
            {posts.length ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {posts.map((p, i) => (
                  <FadeIn key={p.id} delay={i * 0.05}>
                    <Link href={`/dashboard/queue#post-${p.id}`} className="group block">
                      <div className="overflow-hidden rounded-xl border bg-muted shadow-sm"><img src={`/api/frame/${p.id}?v=${p.rev}`} alt="" className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" /></div>
                      <div className="gu mt-2 line-clamp-2 text-[13px] font-medium leading-snug group-hover:text-primary">{p.headline}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] capitalize text-muted-foreground">{p.template} · {timeAgo(p.created_at)}</div>
                    </Link>
                  </FadeIn>
                ))}
              </div>
            ) : <EmptyState icon={<Images />} title="Inbox zero">Nothing pending. Hit “Fetch now” or wait for the next auto-run.</EmptyState>}
          </CardContent>
        </Card>
        <MandiWidget r={latestRates(wsId)} limit={6} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><div><CardTitle>Templates</CardTitle><CardDescription>Auto-picked per story</CardDescription></div></CardHeader>
          <CardContent className="space-y-3">
            {[['news', 'News photo card', 'bg-brand-red'], ['story', 'Person / story card', 'bg-brand-cream border'], ['mandi', 'APMC rate card', 'bg-brand-grey']].map(([k, l, c]) => {
              const n = tc[k] || 0, pct = st.posts ? Math.round((n / st.posts) * 100) : 0;
              return (
                <div key={k}>
                  <div className="mb-1 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className={`size-2.5 rounded-sm ${c}`} />{l}</span><span className="tabular-nums text-muted-foreground">{n}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${c}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
            <a href="/api/epaper" target="_blank" className="mt-2 flex items-center gap-3 rounded-xl border bg-brand-cream p-3 text-neutral-900 transition hover:shadow-soft">
              <Newspaper className="size-5 text-brand-red" /><div className="flex-1"><div className="gu text-sm font-bold">{ws.settings.newspaperName}</div><div className="text-[11px] text-neutral-600">Daily e-paper cover (PNG)</div></div><ArrowRight className="size-4" />
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Pipeline runs</CardTitle><CardDescription>Every {process.env.FETCH_INTERVAL_MINUTES || 5} minutes</CardDescription></div></CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
                  <span className={`size-2 rounded-full ${r.status === 'ok' ? 'bg-emerald-500' : r.status === 'running' ? 'animate-pulse bg-amber-500' : 'bg-rose-500'}`} />
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium">{fmtTime(r.started_at)}</div><div className="text-[12px] text-muted-foreground">{r.new_items ?? 0} new · {r.posts ?? 0} posts{r.finished_at ? ` · ${Math.round((r.finished_at - r.started_at) / 1000)}s` : ''}</div></div>
                  <Badge className="capitalize">{r.trigger}</Badge>
                </li>
              ))}
              {!runs.length ? <li className="text-sm text-muted-foreground">The first run starts a few seconds after boot.</li> : null}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Activity</CardTitle><CardDescription>Latest events</CardDescription></div><Link href="/dashboard/activity" className="text-[13px] text-muted-foreground hover:text-foreground">View all</Link></CardHeader>
          <CardContent>
            <ol className="relative space-y-3 border-l pl-4">
              {log.map((l) => (
                <li key={l.id} className="relative text-[13px]"><span className={`absolute -left-[21px] top-1.5 size-2 rounded-full ring-4 ring-card ${LV[l.level]}`} /><div className="line-clamp-2">{l.msg}</div><div className="text-[11px] text-muted-foreground">{timeAgo(l.ts)}</div></li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
