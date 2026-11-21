'use client';
/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const j = (url: string, method: string, body?: any) => fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }));
const FOCUS: Record<string, string> = { agri: '🌾 Agriculture', industry: '🏭 Industry', rajkot: '📍 Rajkot', general: 'Gujarat' };

export function SettingsClient({ settings, sources, users, workspaces, isAdmin, samplePostId, ai }: any) {
  const r = useRouter();
  const [s, setS] = useState(settings);
  const [msg, setMsg] = useState('');
  const [v, setV] = useState(0);
  const [src, setSrc] = useState({ name: '', url: '', lang: 'en', focus: 'agri' });
  const [user, setUser] = useState({ email: '', name: '', password: '', role: 'editor' });
  const [wsName, setWsName] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const dis = !isAdmin;

  const saveSettings = async () => { const x = await j('/api/settings', 'POST', s); flash(x.ok ? 'Settings saved. New frames use them; use Edit → Save to re-render existing posts.' : x.error); setV(v + 1); r.refresh(); };
  const onLogo = (f?: File) => { if (!f) return; const rd = new FileReader(); rd.onload = () => setS({ ...s, logoUrl: String(rd.result) }); rd.readAsDataURL(f); };

  return (
    <div className="space-y-8">
      {msg ? <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm shadow-lg">{msg}</div> : null}
      {dis ? <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">You are signed in as a non-admin, so settings are read-only.</div> : null}

      <section className="card p-6">
        <h2 className="text-xl font-black mb-4">Brand & frame</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="grid sm:grid-cols-2 gap-4 content-start">
            <div><label className="label">Brand name</label><input disabled={dis} className="input" value={s.brandName} onChange={(e) => setS({ ...s, brandName: e.target.value })} /></div>
            <div><label className="label">Handle</label><input disabled={dis} className="input" value={s.handle} onChange={(e) => setS({ ...s, handle: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Tagline</label><input disabled={dis} className="input" value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} /></div>
            <div><label className="label">Primary colour</label><div className="flex gap-2"><input disabled={dis} type="color" value={s.primary} onChange={(e) => setS({ ...s, primary: e.target.value })} className="h-10 w-14 rounded-lg border" /><input disabled={dis} className="input" value={s.primary} onChange={(e) => setS({ ...s, primary: e.target.value })} /></div></div>
            <div><label className="label">Accent colour</label><div className="flex gap-2"><input disabled={dis} type="color" value={s.accent} onChange={(e) => setS({ ...s, accent: e.target.value })} className="h-10 w-14 rounded-lg border" /><input disabled={dis} className="input" value={s.accent} onChange={(e) => setS({ ...s, accent: e.target.value })} /></div></div>
            <div className="sm:col-span-2"><label className="label">Logo (PNG/JPG, square, &lt;300 KB)</label>
              <div className="flex items-center gap-3">
                {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover border" /> : <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black" style={{ background: s.primary }}>{s.brandName.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2)}</div>}
                <input disabled={dis} type="file" accept="image/png,image/jpeg" onChange={(e) => onLogo(e.target.files?.[0])} className="text-sm" />
                {s.logoUrl ? <button disabled={dis} onClick={() => setS({ ...s, logoUrl: '' })} className="btn-ghost">Remove</button> : null}
              </div>
            </div>
            <div className="sm:col-span-2"><label className="label">Default template</label>
              <div className="grid grid-cols-3 gap-2">{[['breaking', 'Breaking Bold'], ['clean', 'Clean Card'], ['mandi', 'Mandi Bulletin']].map(([id, n]) => (
                <button key={id} disabled={dis} onClick={() => setS({ ...s, template: id })} className={`btn ${s.template === id ? 'bg-slate-900 text-white' : 'btn-ghost'}`}>{n}</button>))}</div>
            </div>
            <div className="sm:col-span-2"><button disabled={dis} onClick={saveSettings} className="btn-primary">Save brand settings</button></div>
          </div>
          <div>
            <label className="label">Template previews (latest post, saved brand)</label>
            {samplePostId ? (
              <div className="grid grid-cols-3 gap-3">
                {['breaking', 'clean', 'mandi'].map((t) => <a key={t} href={`/api/frame/${samplePostId}?tpl=${t}&v=${v}`} target="_blank" rel="noreferrer"><img src={`/api/frame/${samplePostId}?tpl=${t}&v=${v}`} alt={t} className={`rounded-xl border-2 ${s.template === t ? 'border-orange-500' : 'border-transparent'}`} /></a>)}
              </div>
            ) : <div className="text-sm text-slate-500">Previews appear after the first post is generated.</div>}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-black mb-1">AI & pipeline</h2>
        <p className="text-sm text-slate-500 mb-4">Claude status: {ai.available ? <b className="text-emerald-600">active</b> : <b className="text-amber-600">fallback ({ai.configured ? ai.lastError || 'unavailable' : 'no ANTHROPIC_API_KEY'})</b>}. Auto-run every {ai.interval} min.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><label className="label">Output language</label>
            <select disabled={dis} className="input" value={s.language} onChange={(e) => setS({ ...s, language: e.target.value })}><option value="en">English</option><option value="gu">ગુજરાતી (Gujarati)</option></select></div>
          <div><label className="label">Claude model</label><input disabled={dis} className="input font-mono" value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })} /></div>
          <div><label className="label">Max new stories per run</label><input disabled={dis} type="number" min={1} max={30} className="input" value={s.maxPerRun} onChange={(e) => setS({ ...s, maxPerRun: Number(e.target.value) })} /></div>
          <div><label className="label">Auto-approve score ≥ (0 = off)</label><input disabled={dis} type="number" min={0} max={10} className="input" value={s.autoApproveScore} onChange={(e) => setS({ ...s, autoApproveScore: Number(e.target.value) })} /></div>
        </div>
        <button disabled={dis} onClick={saveSettings} className="btn-primary mt-4">Save AI settings</button>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-black mb-1">News sources ({sources.length})</h2>
        <p className="text-sm text-slate-500 mb-4">Any RSS/Atom URL works. Tip: Google News search feeds — <code className="text-xs">https://news.google.com/rss/search?q=YOUR+QUERY&amp;hl=gu&amp;gl=IN&amp;ceid=IN:gu</code></p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2">On</th><th>Name</th><th>Focus</th><th>Lang</th><th>Last fetch</th><th></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map((x: any) => (
                <tr key={x.id}>
                  <td className="py-2"><input type="checkbox" disabled={dis} defaultChecked={!!x.enabled} onChange={async (e) => { await j(`/api/sources/${x.id}`, 'PATCH', { enabled: e.target.checked }); r.refresh(); }} /></td>
                  <td className="max-w-md"><div className="font-semibold">{x.name}</div><div className="text-xs text-slate-400 truncate max-w-md">{x.url}</div></td>
                  <td><select disabled={dis} defaultValue={x.focus} onChange={async (e) => { await j(`/api/sources/${x.id}`, 'PATCH', { focus: e.target.value }); r.refresh(); }} className="rounded-lg border px-2 py-1 text-xs">{Object.entries(FOCUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                  <td>{x.lang}</td>
                  <td className="text-xs">{x.last_status === 'ok' ? <span className="text-emerald-700">✓ {x.last_count} items</span> : x.last_status ? <span className="text-rose-600">{x.last_status}</span> : <span className="text-slate-400">—</span>}</td>
                  <td><button disabled={dis} onClick={async () => { if (confirm('Remove this source?')) { await j(`/api/sources/${x.id}`, 'DELETE'); r.refresh(); } }} className="text-xs text-rose-600 hover:underline disabled:opacity-40">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid sm:grid-cols-6 gap-2">
          <input disabled={dis} placeholder="Name" className="input sm:col-span-1" value={src.name} onChange={(e) => setSrc({ ...src, name: e.target.value })} />
          <input disabled={dis} placeholder="https://… RSS URL" className="input sm:col-span-3" value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} />
          <select disabled={dis} className="input" value={src.focus} onChange={(e) => setSrc({ ...src, focus: e.target.value })}>{Object.entries(FOCUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <div className="flex gap-2"><select disabled={dis} className="input" value={src.lang} onChange={(e) => setSrc({ ...src, lang: e.target.value })}><option value="en">en</option><option value="gu">gu</option></select>
            <button disabled={dis} onClick={async () => { const x = await j('/api/sources', 'POST', src); flash(x.ok ? 'Source added' : x.error); if (x.ok) { setSrc({ name: '', url: '', lang: 'en', focus: 'agri' }); r.refresh(); } }} className="btn-primary">Add</button></div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        <section className="card p-6">
          <h2 className="text-xl font-black mb-1">Workspaces</h2>
          <p className="text-sm text-slate-500 mb-4">One per business. Each has its own sources, brand, frames and queue.</p>
          <ul className="space-y-2 text-sm mb-4">{workspaces.map((w: any) => <li key={w.id} className="rounded-xl bg-slate-50 px-3 py-2 font-semibold">{w.name}</li>)}</ul>
          <div className="flex gap-2">
            <input disabled={dis} placeholder="e.g. Saurashtra Agri Traders" className="input" value={wsName} onChange={(e) => setWsName(e.target.value)} />
            <button disabled={dis || !wsName} onClick={async () => { const x = await j('/api/workspaces', 'POST', { name: wsName, copySources: true }); flash(x.ok ? 'Workspace created (with default Gujarat sources)' : x.error); setWsName(''); r.refresh(); }} className="btn-primary whitespace-nowrap">Create</button>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="text-xl font-black mb-4">Team & roles</h2>
          <ul className="space-y-2 text-sm mb-4">{users.map((u: any) => <li key={u.id} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span><b>{u.name}</b> <span className="text-slate-500">{u.email}</span></span><span className="pill bg-slate-200 text-slate-700 uppercase">{u.role}</span></li>)}</ul>
          <div className="grid grid-cols-2 gap-2">
            <input disabled={dis} placeholder="Email" className="input" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
            <input disabled={dis} placeholder="Name" className="input" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
            <input disabled={dis} placeholder="Password (6+)" type="password" className="input" value={user.password} onChange={(e) => setUser({ ...user, password: e.target.value })} />
            <select disabled={dis} className="input" value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })}><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
            <button disabled={dis} onClick={async () => { const x = await j('/api/users', 'POST', user); flash(x.ok ? 'User added' : x.error); if (x.ok) { setUser({ email: '', name: '', password: '', role: 'editor' }); r.refresh(); } }} className="btn-primary col-span-2">Add team member</button>
          </div>
        </section>
      </div>
    </div>
  );
}
