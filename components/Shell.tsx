'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  ['/dashboard', 'Overview', '📊'],
  ['/dashboard/queue', 'Post queue', '🖼️'],
  ['/dashboard/feed', 'Live feed', '📰'],
  ['/dashboard/activity', 'Activity log', '🧾'],
  ['/dashboard/settings', 'Settings', '⚙️'],
];

export function DashShell({ children, user, workspaces, wsId, brand }: any) {
  const path = usePathname();
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const switchWs = async (id: string) => {
    await fetch('/api/workspaces/switch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    r.refresh();
  };
  const side = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link href="/" className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white" style={{ background: brand.primary }}>GN</div>
        <div className="leading-tight"><div className="font-black text-white">News Studio</div><div className="text-xs text-slate-400">Gujarat · demo</div></div>
      </Link>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Workspace</div>
        <select value={wsId} onChange={(e) => switchWs(e.target.value)} className="w-full rounded-xl bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2">
          {workspaces.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(([href, label, icon]) => {
          const active = href === '/dashboard' ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold ${active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}>
              <span>{icon}</span>{label}
            </Link>
          );
        })}
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"><span>🌐</span>Public portal</Link>
      </nav>
      <div className="mt-auto rounded-xl bg-slate-800 p-3 text-sm">
        <div className="font-semibold text-white truncate">{user.name}</div>
        <div className="text-slate-400 text-xs truncate">{user.email}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="pill bg-orange-500/20 text-orange-300 uppercase">{user.role}</span>
          <form action="/api/auth/logout" method="post"><button className="text-xs text-slate-400 hover:text-white">Sign out</button></form>
        </div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-slate-900">{side}</aside>
      {open ? <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-72 bg-slate-900">{side}</aside></div> : null}
      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-slate-900 px-4 h-14 text-white">
        <button onClick={() => setOpen(true)} className="text-2xl">☰</button><span className="font-black">News Studio</span>
      </div>
      <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
    </div>
  );
}
