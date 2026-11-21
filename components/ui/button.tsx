import * as React from 'react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-glow',
  secondary: 'bg-foreground text-background hover:bg-foreground/90',
  outline: 'border bg-card hover:bg-muted text-foreground',
  ghost: 'hover:bg-muted text-foreground',
  success: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
  danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15',
  link: 'text-primary underline-offset-4 hover:underline px-0',
} as const;
const SIZES = { xs: 'h-7 px-2.5 text-xs rounded-lg', sm: 'h-8 px-3 text-[13px] rounded-lg', md: 'h-9 px-4 text-sm rounded-xl', lg: 'h-11 px-5 text-[15px] rounded-xl', icon: 'h-9 w-9 rounded-xl' } as const;
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES };

export function buttonClass(variant: keyof typeof VARIANTS = 'primary', size: keyof typeof SIZES = 'md', className?: string) {
  return cn('inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0', VARIANTS[variant], SIZES[size], className);
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...p }, ref) => (
  <button ref={ref} className={buttonClass(variant, size, className)} {...p} />
));
Button.displayName = 'Button';
