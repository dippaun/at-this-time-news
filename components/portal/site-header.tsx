'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, ArrowUpRight, Newspaper } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/client';
import { buttonClass } from '@/components/ui/button';
import { BrandMark } from './brand';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/?focus=agri#feed', label: 'ખેતી', en: 'Agriculture' },
  { href: '/#mandi', label: 'મંડી ભાવ', en: 'Mandi rates' },
  { href: '/?focus=industry#feed', label: 'ઉદ્યોગ', en: 'Industry' },
  { href: '/?city=rajkot#feed', label: 'રાજકોટ', en: 'Rajkot' },
  { href: '/#latest', label: 'તાજા સમાચાર', en: 'Latest' },
];

export function SiteHeader({ brand, ticker }: { brand: any; ticker: { id: number; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const path = usePathname();
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className={cn('sticky top-0 z-40 transition-all', scrolled ? 'glass border-b shadow-soft' : 'bg-background')}>
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Home"><BrandMark s={brand} /></Link>
        <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="gu rounded-lg px-3 py-2 text-[15px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">{n.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <form action="/" className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input name="q" placeholder="સમાચાર શોધો…" className="h-9 w-48 rounded-xl border bg-muted/50 pl-9 pr-3 text-sm outline-none transition focus:w-64 focus:bg-card focus:ring-4 focus:ring-primary/10 xl:w-56" />
          </form>
          <a href="/api/epaper" target="_blank" className={buttonClass('ghost', 'icon', 'hidden sm:inline-flex')} title="Today's e-paper"><Newspaper /></a>
          <ThemeToggle />
          <Link href="/dashboard" className={buttonClass('primary', 'md', 'hidden sm:inline-flex')}>Studio <ArrowUpRight /></Link>
          <button className={buttonClass('outline', 'icon', 'lg:hidden')} onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t lg:hidden">
            <div className="container grid gap-1 py-3">
              <form action="/" className="mb-2"><input name="q" placeholder="સમાચાર શોધો…" className="h-10 w-full rounded-xl border bg-muted/50 px-3 text-sm outline-none" /></form>
              {NAV.map((n) => <Link key={n.href} href={n.href} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted"><span className="gu font-semibold">{n.label}</span><span className="text-xs text-muted-foreground">{n.en}</span></Link>)}
              <Link href="/dashboard" className={buttonClass('primary', 'lg', 'mt-2')}>Open Studio <ArrowUpRight /></Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {ticker.length ? (
        <div className="flex h-9 items-center overflow-hidden border-t bg-foreground text-background">
          <span className="z-10 flex h-full shrink-0 items-center gap-2 bg-brand-red px-3 text-[12px] font-bold tracking-wider text-white"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-white" /></span>LIVE</span>
          <div className="group relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
            <div className="flex w-max animate-ticker gap-10 pl-6 group-hover:[animation-play-state:paused]">
              {[...ticker, ...ticker].map((t, i) => (
                <Link key={i} href={`/story/${t.id}`} className="gu flex items-center gap-10 whitespace-nowrap text-[13px] font-medium text-background/85 hover:text-background">{t.title}<span className="size-1 rounded-full bg-brand-red" /></Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
