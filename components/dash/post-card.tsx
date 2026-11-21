'use client';
/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, PenLine, Download, Copy, Film, Loader2, RefreshCw, ExternalLink, Star, Sparkles } from 'lucide-react';
import { Instagram } from '@/components/ui/icons';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';
import { Badge, focusTone, statusTone } from '@/components/ui/badge';
import { Field, Input, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const TEMPLATES = [
  { id: 'news', label: 'News', gu: 'સમાચાર' },
  { id: 'story', label: 'Story', gu: 'વ્યક્તિ' },
  { id: 'mandi', label: 'Mandi', gu: 'બજાર ભાવ' },
  { id: 'reel', label: 'Reel', gu: '9:16' },
] as const;

const api = async (url: string, method: string, body?: any) => {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { ok: res.ok, ...(await res.json().catch(() => ({}))) };
};

export function TemplateSwitch({ value, onChange, saved, className }: { value: string; onChange: (v: string) => void; saved?: string; className?: string }) {
  return (
    <div className={cn('inline-flex rounded-xl border bg-muted/60 p-0.5', className)}>
      {TEMPLATES.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={cn('relative h-7 rounded-lg px-2.5 text-[12px] font-medium transition', value === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          {value === t.id ? <motion.span layoutId={`tpl-${className || ''}`} className="absolute inset-0 rounded-lg bg-card shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 38 }} /> : null}
          <span className="relative inline-flex items-center gap-1">{t.label}{saved === t.id ? <span className="size-1.5 rounded-full bg-primary" /> : null}</span>
        </button>
      ))}
    </div>
  );
}

export function frameSrc(id: number, rev: number, tpl: string, saved: string) {
  if (tpl === 'reel') return `/api/frame/${id}?format=reel&v=${rev}`;
  return `/api/frame/${id}?v=${rev}${tpl !== saved ? `&tpl=${tpl}` : ''}`;
}

export function PostCard({ p, canEdit }: { p: any; canEdit: boolean }) {
  const r = useRouter();
  const [post, setPost] = useState(p);
  const [tpl, setTpl] = useState<string>(p.template);
  const [busy, setBusy] = useState('');
  const [edit, setEdit] = useState(false);
  const [loaded, setLoaded] = useState('');
  const src = frameSrc(post.id, post.rev, tpl, post.template);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => { const i = imgRef.current; if (i?.complete && i.naturalWidth) setLoaded(src); }, [src]);

  const call = async (label: string, url: string, method: string, body?: any) => {
    setBusy(label);
    const j = await api(url, method, body);
    setBusy('');
    if (j.post) setPost((x: any) => ({ ...x, ...j.post }));
    if (!j.ok) toast.error(j.error || j.reason || 'Something went wrong');
    return j;
  };
  const setStatus = async (status: string) => {
    const j = await call(status, `/api/posts/${post.id}`, 'PATCH', { status });
    if (j.ok) { toast.success(status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Moved to pending', { action: { label: 'Undo', onClick: async () => { await api(`/api/posts/${post.id}`, 'PATCH', { status: post.status }); r.refresh(); } } }); r.refresh(); }
  };
  const applyTpl = async () => { const j = await call('tpl', `/api/posts/${post.id}`, 'PATCH', { template: tpl }); if (j.ok) toast.success(`Template set to ${tpl}`); };
  const reel = async () => {
    const t = toast.loading('Rendering 9:16 reel (6s MP4)…');
    const j = await call('reel', `/api/posts/${post.id}/reel`, 'POST');
    if (j.url) { toast.success('Reel ready', { id: t, action: { label: 'Open', onClick: () => window.open(j.url, '_blank') } }); window.open(j.url, '_blank'); } else toast.dismiss(t);
  };
  const copy = async () => { await navigator.clipboard.writeText(post.caption); toast.success('Caption copied'); };
  const isReel = tpl === 'reel';

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} id={`post-${post.id}`} className="group flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:shadow-lift">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <TemplateSwitch value={tpl} onChange={setTpl} saved={post.template} className={`p${post.id}`} />
        <Badge tone={statusTone(post.status)} className="capitalize">{post.status}</Badge>
      </div>
      <div className="relative bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
        <a href={src} target="_blank" rel="noreferrer" className={cn('relative mx-auto block', isReel ? 'aspect-[9/16] max-h-[560px]' : 'aspect-[4/5]')}>
          {loaded !== src ? <div className="absolute inset-0 animate-pulse bg-muted" /> : null}
          <img ref={imgRef} key={src} src={src} alt={post.headline} onLoad={() => setLoaded(src)} className={cn('relative size-full object-contain transition-opacity duration-300', loaded === src ? 'opacity-100' : 'opacity-0')} loading="lazy" />
        </a>
        {busy === 'save' || busy.startsWith('regen') || busy === 'tpl' ? <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm font-medium backdrop-blur-sm"><Loader2 className="size-4 animate-spin" />Re-rendering…</div> : null}
        <AnimatePresence>
          {canEdit && tpl !== post.template && !isReel ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl border bg-card/95 p-2 pl-3 text-[13px] shadow-lift backdrop-blur">
              <span>Preview: <b className="capitalize">{tpl}</b></span>
              <Button size="xs" onClick={applyTpl} disabled={!!busy}>Use template</Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={focusTone(post.focus)}>{post.category}</Badge>
          <Badge><Star className="text-amber-500" />{post.score}/10</Badge>
          <Badge tone={post.summarizer === 'extractive' ? 'default' : 'info'}><Sparkles />{post.summarizer === 'gemini' ? 'Gemini' : post.summarizer === 'claude' ? 'Claude' : 'Extractive'}</Badge>
          {post.reporter ? <Badge tone="outline" className="gu">રિપોર્ટર: {post.reporter}</Badge> : null}
        </div>
        <div className="gu line-clamp-2 text-[15px] font-semibold leading-snug">{post.headline}</div>
        <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary"><ExternalLink className="size-3" /><span className="line-clamp-1">{p.publisher}</span><span className="opacity-60">· portal only, never on Instagram</span></a>
        <div className="gu relative max-h-28 overflow-auto whitespace-pre-wrap rounded-xl border bg-muted/40 p-3 text-[13px] leading-relaxed">{post.caption}
          <button onClick={copy} className="absolute right-2 top-2 rounded-md border bg-card p-1 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100" title="Copy caption"><Copy className="size-3.5" /></button>
        </div>
        <div className="mt-auto space-y-2">
          {canEdit ? (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="success" size="sm" onClick={() => setStatus('approved')} disabled={!!busy || post.status === 'approved'}>{busy === 'approved' ? <Loader2 className="animate-spin" /> : <Check />}Approve</Button>
              <Button variant="danger" size="sm" onClick={() => setStatus('rejected')} disabled={!!busy || post.status === 'rejected'}><X />Reject</Button>
              <Button variant="outline" size="sm" onClick={() => setEdit(true)}><PenLine />Edit</Button>
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <a href={`${src}&download=1`} className={buttonClass('outline', 'sm')}><Download />PNG</a>
            {canEdit ? <Button variant="outline" size="sm" onClick={reel} disabled={!!busy}>{busy === 'reel' ? <Loader2 className="animate-spin" /> : <Film />}Reel</Button> : <span />}
            <Button variant="outline" size="sm" onClick={copy}><Copy />Caption</Button>
          </div>
          <button disabled title="Coming soon: Meta app review pending" className="flex h-8 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-[13px] font-medium text-white opacity-50"><Instagram className="size-4" />Post to Instagram · soon</button>
        </div>
      </div>
      <AnimatePresence>{edit ? <EditSheet post={post} onClose={() => setEdit(false)} onSaved={(np: any) => { setPost((x: any) => ({ ...x, ...np })); setTpl(np.template); }} /> : null}</AnimatePresence>
    </motion.div>
  );
}

function EditSheet({ post, onClose, onSaved }: { post: any; onClose: () => void; onSaved: (p: any) => void }) {
  const kw = () => { try { return JSON.parse(post.keywords || '[]').join(', '); } catch { return ''; } };
  const [form, setForm] = useState({ headline: post.headline, summary: post.summary, caption: post.caption, keywords: kw(), template: post.template, reporter: post.reporter || '' });
  const [busy, setBusy] = useState('');
  const [rev, setRev] = useState(post.rev);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const save = async () => {
    setBusy('save');
    const j = await api(`/api/posts/${post.id}`, 'PATCH', form);
    setBusy('');
    if (j.ok) { onSaved(j.post); toast.success('Saved and re-rendered'); onClose(); } else toast.error(j.error || 'Save failed');
  };
  const regen = async (lang: string) => {
    setBusy(lang);
    const t = toast.loading(lang === 'gu' ? 'ગુજરાતીમાં ફરી લખી રહ્યા છીએ…' : 'Regenerating in English…');
    const j = await api(`/api/posts/${post.id}`, 'POST', { lang });
    setBusy('');
    if (j.post) { toast.success('Regenerated', { id: t }); onSaved(j.post); setRev(j.post.rev); setForm({ ...form, headline: j.post.headline, summary: j.post.summary, caption: j.post.caption, template: j.post.template }); } else toast.error('Failed', { id: t });
  };
  const preview = form.template === 'reel' ? `/api/frame/${post.id}?format=reel&v=${rev}` : `/api/frame/${post.id}?v=${rev}${form.template !== post.template ? `&tpl=${form.template}` : ''}`;
  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-5xl flex-col overflow-hidden border-l bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div><div className="text-[12px] text-muted-foreground">Post #{post.id}</div><div className="text-lg font-semibold">Edit frame & caption</div></div>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>
        <div className="grid flex-1 gap-6 overflow-auto p-6 md:grid-cols-[minmax(0,420px)_1fr]">
          <div className="space-y-3">
            <TemplateSwitch value={form.template} onChange={(v) => setForm({ ...form, template: v === 'reel' ? form.template : v })} saved={post.template} className="edit" />
            <img src={preview} alt="" className="w-full rounded-2xl border shadow-soft" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => regen('gu')} disabled={!!busy}>{busy === 'gu' ? <Loader2 className="animate-spin" /> : <RefreshCw />}ગુજરાતી</Button>
              <Button variant="outline" size="sm" onClick={() => regen('en')} disabled={!!busy}>{busy === 'en' ? <Loader2 className="animate-spin" /> : <RefreshCw />}English</Button>
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Headline on frame (2 lines max)"><Textarea rows={2} className="gu text-[15px] font-semibold" value={form.headline} onChange={set('headline')} /></Field>
            <Field label="Summary (used on story card and portal)"><Textarea rows={4} className="gu" value={form.summary} onChange={set('summary')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reporter tag (optional)" hint="Shows as “રિપોર્ટર: name” on the red header."><Input className="gu" value={form.reporter} onChange={set('reporter')} placeholder="e.g. કરશન બામટા" /></Field>
              <Field label="Keywords (comma separated)"><Input className="gu" value={form.keywords} onChange={set('keywords')} /></Field>
            </div>
            <Field label="Instagram caption" hint="Gujarati, 1–2 lines + #atthistime #viralpost + topic tag. Never mention the source."><Textarea rows={5} className="gu" value={form.caption} onChange={set('caption')} /></Field>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!!busy}>{busy === 'save' ? <Loader2 className="animate-spin" /> : <Check />}Save & re-render</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
