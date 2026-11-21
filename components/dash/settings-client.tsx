'use client';
/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Save, Upload, Trash2, Plus, Palette, Sparkles, Rss, Building2, Users, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/input';
import { Badge, focusTone } from '@/components/ui/badge';
import { BrandMark } from '@/components/portal/brand';
import { cn } from '@/lib/utils';

const api = (url: string, method: string, body?: any) => fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }));
const FOCUS: Record<string, string> = { agri: 'Agriculture', industry: 'Industry', rajkot: 'Rajkot', general: 'Gujarat' };
const SECTIONS = [['brand', 'Brand', Palette], ['frames', 'Frames', LayoutTemplate], ['ai', 'AI & pipeline', Sparkles], ['sources', 'Sources', Rss], ['workspaces', 'Workspaces', Building2], ['team', 'Team', Users]] as const;

function readFile(f: File, max: number, cb: (d: string) => void) {
  if (f.size > max) { toast.error(`File too large (max ${Math.round(max / 1024)} KB)`); return; }
  const rd = new FileReader(); rd.onload = () => cb(String(rd.result)); rd.readAsDataURL(f);
}

export function SettingsClient({ settings, sources, users, workspaces, isAdmin, samplePostId, mandiPostId, ai }: any) {
  const r = useRouter();
  const [s, setS] = useState(settings);
  const [v, setV] = useState(0);
  const [saving, setSaving] = useState(false);
  const [src, setSrc] = useState({ name: '', url: '', lang: 'gu', focus: 'agri' });
  const [user, setUser] = useState({ email: '', name: '', password: '', role: 'editor' });
  const [wsName, setWsName] = useState('');
  const dis = !isAdmin;
  const set = (k: string) => (e: any) => setS({ ...s, [k]: e.target.value });
  const save = async () => {
    setSaving(true);
    const x = await api('/api/settings', 'POST', s);
    setSaving(false);
    if (x.ok) { toast.success('Settings saved', { description: 'New frames use them. Edit → Save re-renders an existing post.' }); setV(v + 1); r.refresh(); } else toast.error(x.error || 'Save failed');
  };
  const SaveBtn = () => <Button disabled={dis || saving} onClick={save}><Save />{saving ? 'Saving…' : 'Save changes'}</Button>;
  const previews = samplePostId ? [
    ['news', `/api/frame/${samplePostId}?tpl=news&v=${v}`, '4:5'], ['story', `/api/frame/${samplePostId}?tpl=story&v=${v}`, '4:5'],
    ['mandi', `/api/frame/${mandiPostId || samplePostId}?tpl=mandi&v=${v}`, '4:5'], ['reel', `/api/frame/${samplePostId}?format=reel&v=${v}`, '9:16'], ['e-paper', `/api/epaper?v=${v}`, '4:5'],
  ] : [];

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav className="hidden lg:block"><div className="sticky top-20 space-y-0.5">{SECTIONS.map(([id, l, I]) => <a key={id} href={`#${id}`} className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"><I className="size-4" />{l}</a>)}</div></nav>
      <div className="min-w-0 space-y-6">
        {dis ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">You are signed in as a non-admin, so settings are read-only.</div> : null}

        <Card id="brand" className="scroll-mt-20">
          <CardHeader><div><CardTitle>Brand</CardTitle><CardDescription>Shown on every frame, reel, the portal and the e-paper.</CardDescription></div><SaveBtn /></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/40 p-4"><BrandMark s={s} /><span className="text-sm text-muted-foreground">Live preview</span></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Brand name"><Input disabled={dis} value={s.brandName} onChange={set('brandName')} /></Field>
              <Field label="Brand tag (second pill)"><Input disabled={dis} value={s.brandTag} onChange={set('brandTag')} /></Field>
              <Field label="Instagram handle"><Input disabled={dis} value={s.handle} onChange={set('handle')} /></Field>
              <Field label="WhatsApp number"><Input disabled={dis} value={s.whatsapp} onChange={set('whatsapp')} /></Field>
              <Field label="Location pill (city)"><Input disabled={dis} className="gu" value={s.location} onChange={set('location')} /></Field>
              <Field label="City hashtag"><Input disabled={dis} value={s.cityTag} onChange={set('cityTag')} /></Field>
              <Field label="App line (strip under the photo)" className="sm:col-span-2 lg:col-span-3"><Input disabled={dis} className="gu" value={s.appLine} onChange={set('appLine')} /></Field>
              <Field label="Default reporter tag" hint="Leave blank to hide."><Input disabled={dis} className="gu" value={s.reporterDefault} onChange={set('reporterDefault')} /></Field>
              <Field label="Primary colour"><div className="flex gap-2"><input disabled={dis} type="color" value={s.primary} onChange={set('primary')} className="h-9 w-12 cursor-pointer rounded-lg border bg-card p-1" /><Input disabled={dis} className="font-mono" value={s.primary} onChange={set('primary')} /></div></Field>
              <Field label="Accent colour"><div className="flex gap-2"><input disabled={dis} type="color" value={s.accent} onChange={set('accent')} className="h-9 w-12 cursor-pointer rounded-lg border bg-card p-1" /><Input disabled={dis} className="font-mono" value={s.accent} onChange={set('accent')} /></div></Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="mb-3 text-[12px] font-medium text-muted-foreground">Logo (square PNG/JPG, under 300 KB)</div>
                <div className="flex items-center gap-3">
                  {s.logoUrl ? <img src={s.logoUrl} alt="" className="size-12 rounded-full border object-cover" /> : <div className="flex size-12 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">LOGO</div>}
                  <label className={cn('inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-[13px] font-medium hover:bg-muted', dis && 'pointer-events-none opacity-50')}><Upload className="size-4" />Upload<input hidden disabled={dis} type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], 300 * 1024, (d) => setS({ ...s, logoUrl: d }))} /></label>
                  {s.logoUrl ? <Button variant="ghost" size="sm" disabled={dis} onClick={() => setS({ ...s, logoUrl: '' })}><Trash2 />Remove</Button> : null}
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="mb-3 text-[12px] font-medium text-muted-foreground">Sponsor banner (1080×240, under 1 MB). Blank = placeholder.</div>
                <div className="flex items-center gap-3">
                  {s.sponsorUrl ? <img src={s.sponsorUrl} alt="" className="h-12 w-48 rounded-lg border object-cover" /> : <div className="gu flex h-12 w-48 items-center justify-center rounded-lg bg-gradient-to-r from-brand-navy to-brand-red text-[12px] font-bold text-amber-300">આપની જાહેરાત અહીં</div>}
                  <label className={cn('inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-[13px] font-medium hover:bg-muted', dis && 'pointer-events-none opacity-50')}><Upload className="size-4" />Upload<input hidden disabled={dis} type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], 1024 * 1024, (d) => setS({ ...s, sponsorUrl: d }))} /></label>
                  {s.sponsorUrl ? <Button variant="ghost" size="sm" disabled={dis} onClick={() => setS({ ...s, sponsorUrl: '' })}><Trash2 /></Button> : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="frames" className="scroll-mt-20">
          <CardHeader><div><CardTitle>Frames & templates</CardTitle><CardDescription>Auto picks Mandi for APMC rate stories, Story for person-led stories with a photo, News otherwise.</CardDescription></div><SaveBtn /></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Template"><Select disabled={dis} value={s.template} onChange={set('template')}><option value="auto">Auto (recommended)</option><option value="news">Always News</option><option value="story">Always Story</option><option value="mandi">Always Mandi</option></Select></Field>
              <Field label="E-paper name"><Input disabled={dis} className="gu" value={s.newspaperName} onChange={set('newspaperName')} /></Field>
              <Field label="E-paper tagline"><Input disabled={dis} value={s.newspaperTagline} onChange={set('newspaperTagline')} /></Field>
            </div>
            {previews.length ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {previews.map(([k, u, ratio]) => (
                  <a key={k} href={u} target="_blank" rel="noreferrer" className="group">
                    <div className="overflow-hidden rounded-xl border bg-muted shadow-sm"><img src={u} alt={k} loading="lazy" className={cn('w-full object-cover transition duration-500 group-hover:scale-[1.03]', ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/5]')} /></div>
                    <div className="mt-1.5 flex items-center justify-between text-[12px]"><span className="font-medium capitalize">{k}</span><span className="text-muted-foreground">{ratio}</span></div>
                  </a>
                ))}
              </div>
            ) : <div className="text-sm text-muted-foreground">Previews appear after the first post is generated.</div>}
          </CardContent>
        </Card>

        <Card id="ai" className="scroll-mt-20">
          <CardHeader><div><CardTitle>AI & pipeline</CardTitle><CardDescription>Gemini (free tier) → Claude (if it has credit) → extractive fallback. Auto-run every {ai.interval} min.</CardDescription></div><SaveBtn /></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[['Gemini', ai.gemini, 'GEMINI_API_KEY'], ['Claude', ai.claude, 'ANTHROPIC_API_KEY']].map(([n, p, k]: any) => (
                <div key={n} className="flex items-start gap-3 rounded-xl border p-3">
                  <span className={cn('mt-1.5 size-2 rounded-full', !p.configured ? 'bg-muted-foreground/40' : p.available ? 'bg-emerald-500' : 'bg-amber-500')} />
                  <div className="min-w-0 text-sm"><div className="font-medium">{n} {ai.active === n.toLowerCase() ? <Badge tone="success" className="ml-1">active</Badge> : null}</div><div className="text-[12px] text-muted-foreground">{!p.configured ? `Not configured (${k})` : p.available ? 'Ready' : 'Backing off'}</div>{p.lastError ? <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{p.lastError}</div> : null}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Output language"><Select disabled={dis} value={s.language} onChange={set('language')}><option value="gu">ગુજરાતી (Gujarati)</option><option value="en">English</option></Select></Field>
              <Field label="AI provider"><Select disabled={dis} value={s.aiProvider} onChange={set('aiProvider')}><option value="auto">Auto (Gemini → Claude → fallback)</option><option value="gemini">Gemini only</option><option value="claude">Claude only</option><option value="extractive">Extractive only (no AI)</option></Select></Field>
              <Field label="Gemini model"><Input disabled={dis} className="font-mono" value={s.geminiModel} onChange={set('geminiModel')} /></Field>
              <Field label="Claude model"><Input disabled={dis} className="font-mono" value={s.model} onChange={set('model')} /></Field>
              <Field label="Max new stories per run"><Input disabled={dis} type="number" min={1} max={30} value={s.maxPerRun} onChange={(e) => setS({ ...s, maxPerRun: Number(e.target.value) })} /></Field>
              <Field label="Auto-approve score ≥ (0 = off)"><Input disabled={dis} type="number" min={0} max={10} value={s.autoApproveScore} onChange={(e) => setS({ ...s, autoApproveScore: Number(e.target.value) })} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card id="sources" className="scroll-mt-20">
          <CardHeader><div><CardTitle>News sources <span className="text-muted-foreground">({sources.length})</span></CardTitle><CardDescription>Any RSS/Atom URL. Google News search feeds work well for niche agri topics.</CardDescription></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2 font-medium">On</th><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Focus</th><th className="px-3 py-2 font-medium">Lang</th><th className="px-3 py-2 font-medium">Last fetch</th><th /></tr></thead>
                <tbody>
                  {sources.map((x: any) => (
                    <tr key={x.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2"><input type="checkbox" className="accent-[hsl(var(--primary))]" disabled={dis} defaultChecked={!!x.enabled} onChange={async (e) => { await api(`/api/sources/${x.id}`, 'PATCH', { enabled: e.target.checked }); toast.success(e.target.checked ? 'Source enabled' : 'Source paused'); r.refresh(); }} /></td>
                      <td className="max-w-md px-3 py-2"><div className="font-medium">{x.name}</div><div className="max-w-md truncate text-[11px] text-muted-foreground">{x.url}</div></td>
                      <td className="px-3 py-2"><select disabled={dis} defaultValue={x.focus} onChange={async (e) => { await api(`/api/sources/${x.id}`, 'PATCH', { focus: e.target.value }); r.refresh(); }} className="rounded-lg border bg-card px-2 py-1 text-xs">{Object.entries(FOCUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                      <td className="px-3 py-2 uppercase text-muted-foreground">{x.lang}</td>
                      <td className="px-3 py-2 text-xs">{x.last_status === 'ok' ? <Badge tone="success">{x.last_count} items</Badge> : x.last_status ? <Badge tone="danger" className="max-w-[160px] truncate">{x.last_status}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2 text-right"><Button variant="ghost" size="xs" disabled={dis} onClick={async () => { if (confirm('Remove this source?')) { await api(`/api/sources/${x.id}`, 'DELETE'); toast.success('Source removed'); r.refresh(); } }}><Trash2 /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto_auto_auto]">
              <Input disabled={dis} placeholder="Name" value={src.name} onChange={(e) => setSrc({ ...src, name: e.target.value })} />
              <Input disabled={dis} placeholder="https://… RSS URL" value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} />
              <Select disabled={dis} value={src.focus} onChange={(e) => setSrc({ ...src, focus: e.target.value })}>{Object.entries(FOCUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
              <Select disabled={dis} value={src.lang} onChange={(e) => setSrc({ ...src, lang: e.target.value })}><option value="gu">gu</option><option value="en">en</option></Select>
              <Button disabled={dis} onClick={async () => { const x = await api('/api/sources', 'POST', src); if (x.ok) { toast.success('Source added'); setSrc({ name: '', url: '', lang: 'gu', focus: 'agri' }); r.refresh(); } else toast.error(x.error); }}><Plus />Add</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card id="workspaces" className="scroll-mt-20">
            <CardHeader><div><CardTitle>Workspaces</CardTitle><CardDescription>One per business: its own sources, brand, frames and queue.</CardDescription></div></CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">{workspaces.map((w: any) => <li key={w.id} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm"><span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-red to-rose-700 text-[11px] font-bold text-white">{w.name.slice(0, 2).toUpperCase()}</span>{w.name}</li>)}</ul>
              <div className="flex gap-2"><Input disabled={dis} placeholder="e.g. Gondal Agri Traders" value={wsName} onChange={(e) => setWsName(e.target.value)} /><Button disabled={dis || !wsName} onClick={async () => { const x = await api('/api/workspaces', 'POST', { name: wsName, copySources: true }); if (x.ok) toast.success('Workspace created'); else toast.error(x.error); setWsName(''); r.refresh(); }}><Plus />Create</Button></div>
            </CardContent>
          </Card>
          <Card id="team" className="scroll-mt-20">
            <CardHeader><div><CardTitle>Team & roles</CardTitle><CardDescription>Admin: everything. Editor: fetch, edit, approve. Viewer: read-only.</CardDescription></div></CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">{users.map((u: any) => <li key={u.id} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"><span className="min-w-0"><span className="font-medium">{u.name}</span> <span className="text-muted-foreground">{u.email}</span></span><Badge tone={u.role === 'admin' ? 'brand' : u.role === 'editor' ? 'info' : 'default'} className="capitalize">{u.role}</Badge></li>)}</ul>
              <div className="grid grid-cols-2 gap-2">
                <Input disabled={dis} placeholder="Email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
                <Input disabled={dis} placeholder="Name" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
                <Input disabled={dis} placeholder="Password (6+)" type="password" value={user.password} onChange={(e) => setUser({ ...user, password: e.target.value })} />
                <Select disabled={dis} value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })}><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></Select>
                <Button className="col-span-2" disabled={dis} onClick={async () => { const x = await api('/api/users', 'POST', user); if (x.ok) { toast.success('Team member added'); setUser({ email: '', name: '', password: '', role: 'editor' }); r.refresh(); } else toast.error(x.error); }}><Plus />Add team member</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
