import * as React from 'react';
import { cn } from '@/lib/utils';
type D = React.HTMLAttributes<HTMLDivElement>;
export const Card = ({ className, ...p }: D) => <div className={cn('rounded-2xl border bg-card text-card-foreground shadow-soft', className)} {...p} />;
export const CardHeader = ({ className, ...p }: D) => <div className={cn('flex items-start justify-between gap-4 p-5 pb-3', className)} {...p} />;
export const CardTitle = ({ className, ...p }: D) => <div className={cn('text-[15px] font-semibold tracking-tight', className)} {...p} />;
export const CardDescription = ({ className, ...p }: D) => <div className={cn('text-[13px] text-muted-foreground', className)} {...p} />;
export const CardContent = ({ className, ...p }: D) => <div className={cn('p-5 pt-0', className)} {...p} />;
