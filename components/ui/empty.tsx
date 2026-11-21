import * as React from 'react';
import { cn } from '@/lib/utils';
export function EmptyState({ icon, title, children, action, className }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center', className)}>
      {icon ? <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border bg-card text-muted-foreground shadow-soft [&_svg]:size-5">{icon}</div> : null}
      <div className="text-[15px] font-semibold">{title}</div>
      {children ? <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
