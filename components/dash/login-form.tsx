'use client';
import { useState } from 'react';
import { ArrowRight, Loader2, Shield, PenLine, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const DEMO = [
  { email: 'admin@demo.com', role: 'Admin', desc: 'Settings, sources, users, workspaces', icon: Shield },
  { email: 'editor@demo.com', role: 'Editor', desc: 'Fetch, edit, approve, render', icon: PenLine },
  { email: 'viewer@demo.com', role: 'Viewer', desc: 'Read-only', icon: Eye },
];

export function LoginForm({ error }: { error?: boolean }) {
  const [email, setEmail] = useState('admin@demo.com');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">Wrong email or password.</div> : null}
      <form action="/api/auth/login" method="post" className="space-y-4" onSubmit={() => setBusy(true)}>
        <Field label="Email"><Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10" /></Field>
        <Field label="Password"><Input name="password" type="password" defaultValue="demo1234" required className="h-10" /></Field>
        <Button size="lg" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : null}Sign in <ArrowRight /></Button>
      </form>
      <div>
        <div className="mb-2 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"><span className="h-px flex-1 bg-border" />Demo accounts · password demo1234<span className="h-px flex-1 bg-border" /></div>
        <div className="grid gap-2">
          {DEMO.map((d) => (
            <button key={d.email} type="button" onClick={() => setEmail(d.email)} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-muted/60', email === d.email && 'border-primary/50 bg-primary/5 ring-4 ring-primary/10')}>
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted"><d.icon className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{d.email}</span><span className="block text-[12px] text-muted-foreground">{d.desc}</span></span>
              <span className="text-[12px] font-medium text-muted-foreground">{d.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
