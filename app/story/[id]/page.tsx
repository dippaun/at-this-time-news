/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Clock, Download } from 'lucide-react';
import { Instagram } from '@/components/ui/icons';
import { latestRates } from '@/lib/db';
import { storyById, relatedStories, fmtTime, timeAgo } from '@/lib/queries';
import { PortalShell } from '@/components/portal/portal-shell';
import { StoryCard, focusLabel } from '@/components/portal/story-card';
import { MandiWidget } from '@/components/portal/mandi-widget';
import { ShareBar } from '@/components/portal/share';
import { SmartImage, FadeIn } from '@/components/ui/client';
import { Badge, focusTone } from '@/components/ui/badge';
import { buttonClass } from '@/components/ui/button';
import { STATIC, imgSrc, frameUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = storyById(Number((await params).id));
  return s ? { title: s.title, description: s.summary.slice(0, 160), openGraph: { images: s.image_url ? [imgSrc(s.image_url)!] : [] } } : {};
}

export default async function StoryPage({ params }: P) {
  const s = storyById(Number((await params).id));
  if (!s) notFound();
  const kw: string[] = (() => { try { return JSON.parse(s.keywords || '[]'); } catch { return []; } })();
  const related = relatedStories(s.ws_id, s.focus, s.id, 4);
  const paras = s.summary.split(/(?<=[.!?।])\s+/).reduce<string[]>((a, x, i) => { if (i % 2 === 0) a.push(x); else a[a.length - 1] += ' ' + x; return a; }, []);
  return (
    <PortalShell>
      <div className="container grid gap-10 py-8 lg:grid-cols-12">
        <article className="min-w-0 lg:col-span-8">
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> All news</Link>
          <FadeIn>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={focusTone(s.focus)}>{focusLabel(s.focus)}</Badge>
              {s.category ? <Badge>{s.category}</Badge> : null}
              {s.post_id ? <Badge tone="info">AI summary</Badge> : null}
            </div>
            <h1 className="gu text-balance text-3xl font-extrabold leading-[1.25] tracking-tight md:text-[44px]">{s.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{s.publisher}</span><span className="opacity-40">•</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{fmtTime(s.published_at)}</span><span className="opacity-40">•</span><span>{timeAgo(s.published_at)}</span>
              <div className="ml-auto"><ShareBar title={s.title} /></div>
            </div>
          </FadeIn>
          <FadeIn delay={0.05}><SmartImage src={s.image_url} focus={s.focus} label={focusLabel(s.focus)} className="mt-6 aspect-[16/9] w-full rounded-3xl border" /></FadeIn>
          <div className="gu mt-8 space-y-5 text-[18px] leading-[1.85] text-foreground/90">{paras.map((p, i) => <p key={i} className={i === 0 ? 'text-[20px] font-medium text-foreground' : ''}>{p}</p>)}</div>
          {kw.length ? <div className="mt-8 flex flex-wrap gap-2">{kw.map((k) => STATIC ? <span key={k} className="gu rounded-full border bg-muted/50 px-3 py-1 text-[13px] font-medium">#{k.replace(/\s+/g, '')}</span> : <Link key={k} href={`/?q=${encodeURIComponent(k)}#feed`} className="gu rounded-full border bg-muted/50 px-3 py-1 text-[13px] font-medium hover:border-primary/40 hover:text-primary">#{k.replace(/\s+/g, '')}</Link>)}</div> : null}
          <div className="mt-8 flex flex-col gap-4 rounded-3xl border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Original report</div><div className="font-semibold">{s.publisher}</div></div>
            <a href={s.link} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'md')}>Read full story <ArrowUpRight /></a>
          </div>
          {related.length ? (
            <section className="mt-14">
              <h2 className="gu mb-5 text-2xl font-extrabold">સંબંધિત સમાચાર</h2>
              <div className="grid gap-5 sm:grid-cols-2">{related.map((r) => <StoryCard key={r.id} s={r} className="h-full" />)}</div>
            </section>
          ) : null}
        </article>
        <aside className="space-y-6 lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
          {s.post_id ? (
            <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
              <div className="flex items-center justify-between p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Instagram className="size-4 text-pink-500" />Instagram post</div><Badge tone="brand">4:5</Badge></div>
              <img src={frameUrl(s.post_id, s.rev, 'post', s.updated_at)} alt="" className="w-full border-y" loading="lazy" />
              <div className="flex gap-2 p-4">
                <a href={frameUrl(s.post_id, s.rev, 'download', s.updated_at)} download className={buttonClass('outline', 'sm', 'flex-1')}><Download />{STATIC ? 'Image' : 'PNG'}</a>
                <a href={frameUrl(s.post_id, s.rev, 'reel', s.updated_at)} target="_blank" className={buttonClass('outline', 'sm', 'flex-1')}>Reel 9:16</a>
              </div>
            </div>
          ) : null}
          <MandiWidget r={latestRates(s.ws_id)} limit={6} />
        </aside>
      </div>
    </PortalShell>
  );
}
