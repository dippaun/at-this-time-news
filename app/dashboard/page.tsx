/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getSession, currentWsId, can } from '@/lib/auth';
import { getWorkspace } from '@/lib/db';
import { stats, listPosts, recentRuns, activity, timeAgo, fmtTime } from '@/lib/queries';
import { FetchNow } from '@/components/FetchNow';
import { AutoRefresh } from '@/components/AutoRefresh';
import { aiStatus } from '@/lib/summarize';
export const dynamic = 'force-dynamic';

const LV: Record<string, string> = { info: 'bg-slate-100 text-slate-600', warn: 'bg-amber-100 text-amber-700', error: 'bg-rose-100 text-rose-700', success: 'bg-emerald-100 text-emerald-700' };

export default async function Overview() {
  const s = await getSession();
  const wsId = await currentWsId();
  const ws = getWorkspace(wsId)!;
  const st = stats(wsId);
  const posts = listPosts(wsId, 'pending', 8);
  const runs = recentRuns(wsId, 6);
  const log = activity(wsId, 12);
  const ai = aiStatus({ provider: ws.settings.aiProvider });
  const cards = [
    ['Stories fetched', st.items, `${st.items24} in last 24h`, 'from-slate-800 to-slate-600'],
    ['🌾 Agriculture', st.agri, 'primary focus', 'from-emerald-700 to-lime-500'],
    ['🏭 Industry', st.industry, 'second focus', 'from-indigo-700 to-sky-500'],
    ['📍 Rajkot', st.rajkot, 'top geography', 'from-orange-600 to-amber-400'],
    ['Pending review', st.pending, `${st.approved} approved · ${st.rejected} rejected`, 'from-rose-600 to-orange-500'],
    ['Pipeline runs', st.runs, `${st.sources} sources · ${st.ai} AI posts`, 'from-purple-700 to-fuchsia-500'],
  ];
  return (
    <div className="space-y-8">
      <AutoRefresh seconds={45} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-orange-700">{ws.name}</div>
          <h1 className="text-3xl font-black tracking-tight">Good to see you, {s!.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-500">Live Gujarat news → AI summary → branded 1080×1350 frames → your approval.</p>
        </div>
        <FetchNow canRun={can(s, 'editor')} />
      </div>

      {!ai.available ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <b>No AI provider is active right now</b>{ai.lastError ? <> — <span className="font-mono">{ai.lastError}</span></> : ' — no GEMINI_API_KEY / ANTHROPIC_API_KEY configured'}. Posts are being summarised with the built-in extractive summariser, so the pipeline keeps running. It switches back to AI automatically once a provider works.
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map(([t, v, sub, g]) => (
          <div key={t as string} className={`rounded-2xl bg-gradient-to-br ${g} p-4 text-white shadow-sm`}>
            <div className="text-xs font-semibold text-white/80">{t}</div>
            <div className="text-3xl font-black mt-1">{v as number}</div>
            <div className="text-xs text-white/70 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Waiting for review</h2>
            <Link href="/dashboard/queue" className="text-sm font-semibold text-orange-700">Open queue →</Link>
          </div>
          {posts.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {posts.map((p) => (
                <Link key={p.id} href={`/dashboard/queue#post-${p.id}`} className="group">
                  <img src={`/api/frame/${p.id}?v=${p.rev}`} alt="" className="rounded-xl border border-slate-200 aspect-[4/5] object-cover group-hover:ring-2 ring-orange-500" loading="lazy" />
                  <div className="mt-1 text-xs font-semibold line-clamp-2">{p.headline}</div>
                </Link>
              ))}
            </div>
          ) : <div className="text-sm text-slate-500">Nothing pending. Hit “Fetch now” or wait for the next auto-run.</div>}
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-lg mb-3">Recent pipeline runs</h2>
          <ul className="space-y-2 text-sm">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <div>
                  <div className="font-semibold">{fmtTime(r.started_at)} <span className="pill bg-slate-200 text-slate-700 ml-1">{r.trigger}</span></div>
                  <div className="text-xs text-slate-500">{r.fetched} fetched · {r.new_items} new · {r.posts} posts{r.finished_at ? ` · ${Math.round((r.finished_at - r.started_at) / 1000)}s` : ''}</div>
                </div>
                <span className={`pill ${r.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : r.status === 'running' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700'}`}>{r.status}</span>
              </li>
            ))}
            {!runs.length ? <li className="text-slate-500">First run starts a few seconds after boot.</li> : null}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-lg">Activity</h2><Link href="/dashboard/activity" className="text-sm font-semibold text-orange-700">Full log →</Link></div>
        <ul className="divide-y divide-slate-100 text-sm">
          {log.map((l) => (
            <li key={l.id} className="py-2 flex gap-3 items-start">
              <span className={`pill ${LV[l.level]} shrink-0 w-16 justify-center`}>{l.level}</span>
              <span className="flex-1">{l.msg}</span>
              <span className="text-xs text-slate-400 shrink-0">{timeAgo(l.ts)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
