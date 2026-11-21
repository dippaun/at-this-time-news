/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { listWorkspaces } from '@/lib/db';
import { portalSections, timeAgo } from '@/lib/queries';
import { NewsCard, Thumb } from '@/components/NewsCard';
import { AutoRefresh } from '@/components/AutoRefresh';

export const dynamic = 'force-dynamic';

function Section({ id, icon, title, gu, color, children }: any) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl ${color}`}>{icon}</span>
          {title} <span className="text-slate-400 font-bold text-xl">{gu}</span>
        </h2>
      </div>
      {children}
    </section>
  );
}

export default async function Portal() {
  const ws = listWorkspaces()[0];
  const s = ws.settings;
  const sec = portalSections(ws.id);
  const lead = sec.agri[0];
  const empty = !sec.latest.length;
  return (
    <div>
      <AutoRefresh seconds={120} />
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black" style={{ background: s.primary }}>
              {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /> : s.brandName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2)}
            </div>
            <div className="leading-tight">
              <div className="font-black text-lg">{s.brandName}</div>
              <div className="text-xs text-slate-500">{s.tagline}</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-6 text-sm font-semibold">
            <a href="#agri" className="px-3 py-2 rounded-lg hover:bg-emerald-50 text-emerald-700">🌾 Agriculture</a>
            <a href="#industry" className="px-3 py-2 rounded-lg hover:bg-indigo-50 text-indigo-700">🏭 Industry</a>
            <a href="#rajkot" className="px-3 py-2 rounded-lg hover:bg-orange-50 text-orange-700">📍 Rajkot</a>
            <a href="#latest" className="px-3 py-2 rounded-lg hover:bg-slate-100">Latest</a>
          </nav>
          <Link href="/dashboard" className="ml-auto btn-primary">Open Studio →</Link>
        </div>
        <div className="bg-slate-900 text-white text-sm overflow-hidden">
          <div className="flex items-center">
            <span className="shrink-0 bg-red-600 px-3 py-1.5 font-bold flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-white animate-pulse" /> LIVE</span>
            <div className="overflow-hidden whitespace-nowrap">
              <div className="ticker inline-flex gap-10 py-1.5 pl-6">
                {[...sec.latest, ...sec.latest].map((it: any, i: number) => (
                  <a key={i} href={it.link} target="_blank" rel="noreferrer" className="hover:text-amber-300">{it.title} <span className="text-slate-400">· {it.publisher}</span></a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-14">
        {empty ? (
          <div className="card p-10 text-center">
            <div className="text-2xl font-bold">Fetching the first live stories…</div>
            <p className="text-slate-500 mt-2">The pipeline runs every 5 minutes. This page refreshes automatically.</p>
          </div>
        ) : null}

        {lead ? (
          <Section id="agri" icon="🌾" title="Agriculture & Mandi" gu="ખેતી · માર્કેટ યાર્ડ" color="bg-emerald-100">
            <div className="grid lg:grid-cols-5 gap-5">
              <a href={lead.link} target="_blank" rel="noreferrer" className="lg:col-span-3 group card overflow-hidden grid md:grid-cols-2">
                <div className="bg-slate-900 aspect-[4/5] overflow-hidden">
                  {lead.post_id ? <img src={`/api/frame/${lead.post_id}?v=${lead.rev}`} alt="" className="h-full w-full object-cover" /> : <Thumb it={lead} />}
                </div>
                <div className="p-6 flex flex-col gap-3">
                  <span className="pill bg-emerald-600 text-white self-start">Top agri story</span>
                  <h3 className="text-2xl md:text-3xl font-black leading-tight group-hover:text-emerald-700">{lead.headline || lead.title}</h3>
                  <p className="text-slate-600">{lead.summary || lead.description}</p>
                  <div className="mt-auto text-sm text-slate-500">{lead.publisher} · {timeAgo(lead.published_at)}</div>
                </div>
              </a>
              <div className="lg:col-span-2 grid gap-3">
                {sec.agri.slice(1, 5).map((it: any) => (
                  <a key={it.id} href={it.link} target="_blank" rel="noreferrer" className="card p-3 flex gap-3 hover:shadow-md group">
                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100"><Thumb it={it} /></div>
                    <div className="min-w-0">
                      <div className="font-bold leading-snug line-clamp-2 group-hover:text-emerald-700">{it.headline || it.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{it.publisher} · {timeAgo(it.published_at)}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
              {sec.agri.slice(5, 9).map((it: any) => <NewsCard key={it.id} it={it} />)}
            </div>
          </Section>
        ) : null}

        {sec.industry.length ? (
          <Section id="industry" icon="🏭" title="Industry & Business" gu="ઉદ્યોગ · વેપાર" color="bg-indigo-100">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sec.industry.map((it: any, i: number) => <NewsCard key={it.id} it={it} big={i === 0} />)}
            </div>
          </Section>
        ) : null}

        {sec.rajkot.length ? (
          <Section id="rajkot" icon="📍" title="Rajkot & Saurashtra" gu="રાજકોટ · સૌરાષ્ટ્ર" color="bg-orange-100">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sec.rajkot.map((it: any) => <NewsCard key={it.id} it={it} />)}
            </div>
          </Section>
        ) : null}

        <Section id="latest" icon="⚡" title="Latest from Gujarat" gu="તાજા સમાચાર" color="bg-slate-200">
          <div className="card divide-y divide-slate-100">
            {sec.latest.map((it: any) => (
              <a key={it.id} href={it.link} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <span className="w-20 shrink-0 text-xs font-semibold text-slate-500">{timeAgo(it.published_at)}</span>
                <span className="font-semibold flex-1">{it.title}</span>
                <span className="hidden sm:block text-xs text-slate-500 shrink-0">{it.publisher}</span>
              </a>
            ))}
          </div>
        </Section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500 flex flex-wrap gap-2 justify-between">
          <span>© {s.brandName} · Powered by Gujarat News Studio (demo). Headlines link to original publishers.</span>
          <Link href="/login" className="font-semibold text-orange-700">Team login</Link>
        </div>
      </footer>
    </div>
  );
}
