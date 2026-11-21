'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Images, Rss, Activity, Settings, Globe, Menu, Search, ChevronsUpDown, LogOut, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/client';
import { BrandMark } from '@/components/portal/brand';
import { CommandPalette } from './command-palette';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/queue', label: 'Post queue', icon: Images, badge: 'pending' },
  { href: '/dashboard/feed', label: 'Live feed', icon: Rss },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function WorkspaceSwitcher({ workspaces, wsId }: { workspaces: { id: number; name: string }[]; wsId: number }) {
  const [open, setOpen] = useState(false);
  const r = useRouter();
  const cur = workspaces.find((w) => w.id === wsId);
  const pick = async (id: number) => {
    setOpen(false);
    if (id === wsId) return;
    await fetch('/api/workspaces/switch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    toast.success(`Switched to ${workspaces.find((w) => w.id === id)?.name}`);
    r.refresh();
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-xl border bg-card p-2 text-left shadow-sm transition hover:bg-muted">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-red to-rose-700 text-[12px] font-bold text-white">{cur?.name.slice(0, 2).toUpperCase()}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{cur?.name}</span><span className="block text-[11px] text-muted-foreground">Workspace</span></span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute inset-x-0 top-full z-50 mt-1 rounded-xl border bg-card p-1 shadow-lift">
            {workspaces.map((w) => <button key={w.id} onClick={() => pick(w.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted">{w.name}{w.id === wsId ? <Check className="size-4 text-primary" /> : null}</button>)}
            <Link href="/dashboard/settings#workspaces" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">+ New workspace</Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function DashShell({ children, user, workspaces, wsId, brand, pending, posts }: any) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const canRun = user.role !== 'viewer';
  const side = (
    <div className="flex h-full flex-col gap-5 p-4">
      <Link href="/" className="flex items-center px-1 pt-1"><BrandMark s={brand} /></Link>
      <WorkspaceSwitcher workspaces={workspaces} wsId={wsId} />
      <button onClick={() => window.dispatchEvent(new Event('open-cmdk'))} className="flex h-9 items-center gap-2 rounded-xl border bg-muted/50 px-3 text-sm text-muted-foreground transition hover:bg-muted">
        <Search className="size-4" />Search…<kbd className="ml-auto rounded border bg-card px-1.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      <nav className="flex flex-col gap-0.5">
        <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Studio</div>
        {NAV.map((n) => {
          const active = n.href === '/dashboard' ? path === n.href : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={cn('group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition', active ? 'text-foreground' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground')}>
              {active ? <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg border bg-card shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 40 }} /> : null}
              <n.icon className={cn('relative size-4', active && 'text-primary')} /><span className="relative">{n.label}</span>
              {n.badge && pending ? <span className="relative ml-auto rounded-md bg-primary/10 px-1.5 text-[11px] font-semibold tabular-nums text-primary">{pending}</span> : null}
            </Link>
          );
        })}
        <Link href="/" className="flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"><Globe className="size-4" />Public portal</Link>
      </nav>
      <div className="mt-auto flex items-center gap-3 rounded-xl border bg-card p-2.5 shadow-sm">
        <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-[12px] font-semibold text-background">{user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</span>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{user.name}</div><div className="truncate text-[11px] capitalize text-muted-foreground">{user.role} · {user.email}</div></div>
        <form action="/api/auth/logout" method="post"><button title="Sign out" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button></form>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-muted/30 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background/80 backdrop-blur lg:block">{side}</aside>
      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', stiffness: 400, damping: 40 }} className="absolute inset-y-0 left-0 w-72 border-r bg-background">{side}</motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 md:px-8">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-muted lg:hidden" aria-label="Menu"><Menu className="size-5" /></button>
        <div className="text-sm text-muted-foreground"><span className="hidden sm:inline">{workspaces.find((w: any) => w.id === wsId)?.name} / </span><span className="font-medium capitalize text-foreground">{NAV.find((n) => (n.href === '/dashboard' ? path === n.href : path.startsWith(n.href)))?.label || 'Studio'}</span></div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => window.dispatchEvent(new Event('open-cmdk'))} className="hidden h-9 items-center gap-2 rounded-xl border bg-card px-3 text-sm text-muted-foreground shadow-sm hover:text-foreground md:flex"><Search className="size-4" />Quick actions<kbd className="rounded border bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd></button>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] p-4 md:p-8">{children}</main>
      <CommandPalette posts={posts} canRun={canRun} />
    </div>
  );
}
