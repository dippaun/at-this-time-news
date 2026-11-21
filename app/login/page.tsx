/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { db, listWorkspaces } from '@/lib/db';
import { LoginForm } from '@/components/dash/login-form';
import { BrandMark } from '@/components/portal/brand';
import { ThemeToggle } from '@/components/ui/client';
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const ws = listWorkspaces()[0];
  const one = (t: string) => db().prepare("SELECT id, rev FROM posts WHERE ws_id=? AND status != 'rejected' AND template=? ORDER BY id DESC LIMIT 1").get(ws.id, t) as any;
  const frames = ['story', 'news', 'mandi'].map(one).filter(Boolean);
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0b1230] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(227,30,36,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(27,42,92,0.9),transparent_60%)]" />
        <div className="relative"><BrandMark s={ws.settings} /></div>
        <div className="relative">
          <h1 className="text-[44px] font-semibold leading-[1.1] tracking-tight">Gujarat news to Instagram,<br /><span className="text-white/60">every five minutes.</span></h1>
          <p className="gu mt-5 max-w-lg text-lg text-white/70">ખેતી, માર્કેટ યાર્ડ ભાવ, ઉદ્યોગ અને રાજકોટના સમાચાર: આપમેળે મેળવી, Gemini થી સારાંશ, બ્રાન્ડ ફ્રેમ અને રીલ.</p>
          {frames.length ? (
            <div className="mt-10 flex items-end gap-4">
              {frames.map((f, i) => <img key={f.id} src={`/api/frame/${f.id}?v=${f.rev}`} alt="" className="w-40 rounded-xl border border-white/10 shadow-2xl xl:w-48" style={{ transform: `rotate(${(i - 1) * 4}deg) translateY(${i === 1 ? -16 : 0}px)` }} />)}
            </div>
          ) : null}
        </div>
        <div className="relative text-sm text-white/40">Demo build · Next.js · SQLite · Satori · Gemini free tier</div>
      </div>
      <div className="relative flex items-center justify-center p-6">
        <div className="absolute right-4 top-4 flex items-center gap-2"><ThemeToggle /></div>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><BrandMark s={ws.settings} /></div>
          <h2 className="text-2xl font-semibold tracking-tight">Sign in to Studio</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick a demo account below or type your own.</p>
          <div className="mt-8"><LoginForm error={!!sp.error} /></div>
          <Link href="/" className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to the live portal</Link>
        </div>
      </div>
    </div>
  );
}
