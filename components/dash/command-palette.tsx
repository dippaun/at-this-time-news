'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Images, Rss, Activity, Settings, Globe, Zap, Moon, Newspaper, FileImage, Search, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/components/ui/client';

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); } };
    const o = () => setOpen(true);
    window.addEventListener('keydown', k); window.addEventListener('open-cmdk', o);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('open-cmdk', o); };
  }, []);
  return { open, setOpen };
}

const item = 'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground aria-selected:bg-muted aria-selected:text-foreground [&_svg]:size-4';
const group = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70';

export function CommandPalette({ posts, canRun }: { posts: { id: number; headline: string; status: string }[]; canRun: boolean }) {
  const { open, setOpen } = useCommandPalette();
  const r = useRouter();
  const { toggle } = useTheme();
  const go = (fn: () => void) => { setOpen(false); fn(); };
  const nav = [
    ['Overview', '/dashboard', LayoutDashboard], ['Post queue', '/dashboard/queue', Images], ['Live feed', '/dashboard/feed', Rss],
    ['Activity log', '/dashboard/activity', Activity], ['Settings', '/dashboard/settings', Settings], ['Public portal', '/', Globe],
  ] as const;
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div initial={{ scale: 0.97, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: -8 }} transition={{ duration: 0.15 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border bg-card shadow-2xl">
            <Command loop className="flex flex-col">
              <div className="flex items-center gap-2 border-b px-4"><Search className="size-4 text-muted-foreground" /><Command.Input autoFocus placeholder="Search pages, actions and posts…" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /><kbd className="rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">ESC</kbd></div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="py-10 text-center text-sm text-muted-foreground">No results.</Command.Empty>
                <Command.Group heading="Actions" className={group}>
                  {canRun ? <Command.Item className={item} onSelect={() => go(async () => { const t = toast.loading('Starting pipeline…'); await fetch('/api/run', { method: 'POST' }); toast.success('Pipeline started. New posts appear in the queue.', { id: t }); })}><Zap />Fetch news now</Command.Item> : null}
                  <Command.Item className={item} onSelect={() => go(toggle)}><Moon />Toggle dark mode</Command.Item>
                  <Command.Item className={item} onSelect={() => go(() => window.open('/api/epaper', '_blank'))}><Newspaper />Open today&apos;s e-paper cover</Command.Item>
                  <Command.Item className={item} onSelect={() => go(() => r.push('/dashboard/queue?status=pending'))}><FileImage />Review pending posts</Command.Item>
                </Command.Group>
                <Command.Group heading="Navigate" className={group}>
                  {nav.map(([l, h, I]) => <Command.Item key={h} className={item} onSelect={() => go(() => r.push(h))}><I />{l}</Command.Item>)}
                </Command.Group>
                {posts.length ? (
                  <Command.Group heading="Posts" className={group}>
                    {posts.map((p) => <Command.Item key={p.id} value={`${p.id} ${p.headline}`} className={item} onSelect={() => go(() => r.push(`/dashboard/queue?status=all&focus=${p.id}#post-${p.id}`))}><FileImage /><span className="gu line-clamp-1 flex-1">{p.headline}</span><span className="text-[11px] capitalize opacity-60">{p.status}</span></Command.Item>)}
                  </Command.Group>
                ) : null}
                <Command.Group heading="Account" className={group}>
                  <Command.Item className={item} onSelect={() => go(async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; })}><LogOut />Sign out</Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
