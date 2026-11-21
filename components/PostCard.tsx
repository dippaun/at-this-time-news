'use client';
/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const TPL = [['breaking', 'Breaking Bold'], ['clean', 'Clean Card'], ['mandi', 'Mandi Bulletin']];
const STATUS: Record<string, string> = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-rose-100 text-rose-800' };
const FOCUS: Record<string, string> = { agri: 'bg-emerald-600 text-white', industry: 'bg-indigo-600 text-white', rajkot: 'bg-orange-600 text-white', general: 'bg-slate-700 text-white' };

export function PostCard({ p, canEdit }: { p: any; canEdit: boolean }) {
  const r = useRouter();
  const [post, setPost] = useState(p);
  const [busy, setBusy] = useState('');
  const [edit, setEdit] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ headline: p.headline, summary: p.summary, caption: p.caption, keywords: JSON.parse(p.keywords || '[]').join(', '), template: p.template });
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const call = async (label: string, url: string, method: string, body?: any) => {
    setBusy(label);
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({}));
    setBusy('');
    if (j.post) setPost(j.post);
    if (!res.ok) flash(j.error || j.reason || 'Failed');
    return j;
  };
  const setStatus = async (status: string) => { await call(status, `/api/posts/${post.id}`, 'PATCH', { status }); r.refresh(); };
  const save = async () => { const j = await call('save', `/api/posts/${post.id}`, 'PATCH', form); if (j.ok) { setEdit(false); flash('Saved & re-rendered'); } };
  const regen = async (lang: string) => {
    const j = await call('regen-' + lang, `/api/posts/${post.id}`, 'POST', { lang });
    if (j.post) setForm({ headline: j.post.headline, summary: j.post.summary, caption: j.post.caption, keywords: JSON.parse(j.post.keywords || '[]').join(', '), template: j.post.template });
  };
  const reel = async () => { const j = await call('reel', `/api/posts/${post.id}/reel`, 'POST'); if (j.url) window.open(j.url, '_blank'); };
  const copy = async () => { await navigator.clipboard.writeText(post.caption); flash('Caption copied'); };
  const src = `/api/frame/${post.id}?v=${post.rev}`;

  return (
    <div id={`post-${post.id}`} className="card overflow-hidden flex flex-col scroll-mt-20">
      <div className="relative bg-slate-900">
        <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={post.headline} className="w-full aspect-[4/5] object-cover" loading="lazy" /></a>
        {busy === 'save' || busy.startsWith('regen') ? <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">Re-rendering…</div> : null}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className={`pill ${FOCUS[post.focus] || FOCUS.general}`}>{post.category}</span>
          <span className="pill bg-white/90 text-slate-900">★ {post.score}/10</span>
        </div>
        <span className={`absolute bottom-3 right-3 pill ${STATUS[post.status]}`}>{post.status}</span>
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className={`pill ${post.summarizer === 'gemini' ? 'bg-sky-100 text-sky-800' : post.summarizer === 'claude' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>{post.summarizer === 'gemini' ? `Gemini · ${post.model}` : post.summarizer === 'claude' ? `Claude · ${post.model}` : 'Extractive summary'}</span>
          <span className="pill bg-slate-100 text-slate-600">{post.lang === 'gu' ? 'ગુજરાતી' : 'English'}</span>
          <span className="pill bg-slate-100 text-slate-600">{TPL.find((t) => t[0] === post.template)?.[1]}</span>
        </div>
        <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-orange-700 line-clamp-1">↗ {p.publisher}: {p.title}</a>
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 bg-slate-50 rounded-xl p-3 max-h-40 overflow-auto">{post.caption}</pre>
        {msg ? <div className="text-xs font-semibold text-orange-700">{msg}</div> : null}
        <div className="mt-auto grid grid-cols-2 gap-2">
          {canEdit ? <>
            <button onClick={() => setStatus('approved')} disabled={!!busy || post.status === 'approved'} className="btn-green">✓ Approve</button>
            <button onClick={() => setStatus('rejected')} disabled={!!busy || post.status === 'rejected'} className="btn-red">✕ Reject</button>
            <button onClick={() => setEdit(true)} className="btn-ghost">✎ Edit</button>
          </> : null}
          <a href={`${src}&download=1`} className="btn-ghost">⬇ PNG</a>
          <button onClick={copy} className="btn-ghost">⧉ Copy caption</button>
          {canEdit ? <button onClick={reel} disabled={!!busy} className="btn-ghost">{busy === 'reel' ? 'Rendering…' : '🎬 Reel MP4'}</button> : null}
          <button disabled title="Coming soon — Meta app review pending" className="btn col-span-2 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 text-white opacity-50 cursor-not-allowed">Post to Instagram (coming soon)</button>
        </div>
      </div>

      {edit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEdit(false)}>
          <div className="w-full max-w-4xl max-h-[92vh] overflow-auto rounded-2xl bg-white p-6 grid md:grid-cols-2 gap-6" onClick={(e) => e.stopPropagation()}>
            <div>
              <img src={`/api/frame/${post.id}?v=${post.rev}${form.template !== post.template ? `&tpl=${form.template}` : ''}`} alt="" className="rounded-xl border w-full" />
              <div className="mt-3 flex gap-2">
                <button onClick={() => regen('en')} disabled={!!busy} className="btn-ghost flex-1">{busy === 'regen-en' ? '…' : '↻ Regenerate EN'}</button>
                <button onClick={() => regen('gu')} disabled={!!busy} className="btn-ghost flex-1">{busy === 'regen-gu' ? '…' : '↻ ગુજરાતીમાં'}</button>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black">Edit post #{post.id}</h3>
              <div><label className="label">Template</label>
                <div className="grid grid-cols-3 gap-2">{TPL.map(([id, n]) => <button key={id} onClick={() => setForm({ ...form, template: id })} className={`btn ${form.template === id ? 'bg-slate-900 text-white' : 'btn-ghost'}`}>{n}</button>)}</div>
              </div>
              <div><label className="label">Headline (on frame)</label><textarea className="input" rows={2} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
              <div><label className="label">Summary (on frame)</label><textarea className="input" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
              <div><label className="label">Keywords (comma separated)</label><input className="input" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></div>
              <div><label className="label">Instagram caption</label><textarea className="input" rows={6} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} /></div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setEdit(false)} className="btn-ghost">Cancel</button>
                <button onClick={save} disabled={!!busy} className="btn-primary">{busy === 'save' ? 'Rendering…' : 'Save & re-render'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
