import * as React from 'react';
import { cn } from '@/lib/utils';
const TONES = {
  default: 'bg-muted text-muted-foreground border-transparent',
  outline: 'bg-transparent text-foreground',
  brand: 'bg-primary/10 text-primary border-primary/20',
  agri: 'bg-agri/10 text-agri border-agri/20',
  industry: 'bg-industry/10 text-industry border-industry/20',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  solid: 'bg-foreground text-background border-transparent',
} as const;
export type Tone = keyof typeof TONES;
export function Badge({ tone = 'default', className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 [&_svg]:size-3', TONES[tone], className)} {...p} />;
}
export const focusTone = (f?: string): Tone => (f === 'agri' ? 'agri' : f === 'industry' ? 'industry' : f === 'rajkot' ? 'brand' : 'default');
export const statusTone = (s?: string): Tone => (s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : s === 'pending' ? 'warning' : 'default');
