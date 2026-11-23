'use client';
/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { Toaster as Sonner } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { imgSrc } from '@/lib/site';

export function FadeIn({ delay = 0, y = 12, className, ...p }: HTMLMotionProps<'div'> & { delay?: number; y?: number }) {
  return <motion.div initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay, ease: [0.21, 0.47, 0.32, 0.98] }} className={className} {...p} />;
}

export function useTheme() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  const toggle = React.useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
    setDark(next);
  }, []);
  return { dark, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className={cn('relative inline-flex size-9 items-center justify-center rounded-xl border bg-card text-muted-foreground transition hover:text-foreground', className)}>
      <Sun className={cn('size-4 transition-all', dark ? 'scale-0 -rotate-90' : 'scale-100 rotate-0')} />
      <Moon className={cn('absolute size-4 transition-all', dark ? 'scale-100 rotate-0' : 'scale-0 rotate-90')} />
    </button>
  );
}

/** Remote image with a branded gradient fallback when it is missing or fails. */
export function SmartImage({ src, alt = '', className, label, focus }: { src?: string | null; alt?: string; className?: string; label?: string; focus?: string }) {
  const [bad, setBad] = React.useState(!src);
  const [loaded, setLoaded] = React.useState(false);
  const ref = React.useRef<HTMLImageElement>(null);
  // The image can finish loading before hydration, so onLoad never fires: check on mount.
  React.useEffect(() => { const i = ref.current; if (i && i.complete) { if (i.naturalWidth > 0) setLoaded(true); else setBad(true); } }, []);
  if (bad) {
    return (
      <div className={cn('relative flex items-center justify-center overflow-hidden', focus === 'agri' ? 'bg-gradient-to-br from-emerald-800 via-lime-700 to-amber-500' : focus === 'industry' ? 'bg-gradient-to-br from-brand-navy via-indigo-700 to-sky-500' : 'bg-gradient-to-br from-brand-navy via-[#2b3f86] to-brand-red', className)}>
        <div className="absolute -right-10 -top-10 size-40 rounded-full border-[28px] border-white/10" />
        <span className="gu px-4 text-center text-2xl font-extrabold text-white/30">{label || 'AT THIS TIME'}</span>
      </div>
    );
  }
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-muted" /> : null}
      <img ref={ref} src={imgSrc(src)!} alt={alt} loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setBad(true)} className={cn('size-full object-cover transition duration-500', loaded ? 'opacity-100' : 'opacity-0')} />
    </div>
  );
}

export function Toaster() {
  const { dark } = useTheme();
  return <Sonner theme={dark ? 'dark' : 'light'} position="bottom-right" richColors closeButton toastOptions={{ className: 'font-sans' }} />;
}

export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const r = useRouter();
  React.useEffect(() => { const t = setInterval(() => { if (document.visibilityState === 'visible') r.refresh(); }, seconds * 1000); return () => clearInterval(t); }, [r, seconds]);
  return null;
}
