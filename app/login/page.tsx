import Link from 'next/link';
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const demo = [['admin@demo.com', 'Admin', 'Everything incl. settings, sources, users, workspaces'], ['editor@demo.com', 'Editor', 'Fetch, approve/reject, edit, render'], ['viewer@demo.com', 'Viewer', 'Read-only']];
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-orange-700 via-red-700 to-emerald-800 p-12 text-white">
        <Link href="/" className="font-black text-2xl">Gujarat News Studio</Link>
        <div>
          <h1 className="text-5xl font-black leading-tight">Live Gujarat news → AI summary → branded post.<br /><span className="text-amber-300">Every 5 minutes.</span></h1>
          <p className="mt-6 text-lg text-white/80">ખેતી, માર્કેટ યાર્ડ ભાવ, ઉદ્યોગ અને રાજકોટના તાજા સમાચાર — auto-fetched, summarised, framed and queued for your team.</p>
        </div>
        <div className="text-sm text-white/60">Demo build · free stack · Next.js + SQLite + Satori</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-black">Sign in</h2>
          <p className="text-slate-500 mt-1">Use one of the demo accounts below.</p>
          {sp.error ? <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">Wrong email or password.</div> : null}
          <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
            <div><label className="label">Email</label><input name="email" type="email" defaultValue="admin@demo.com" className="input" required /></div>
            <div><label className="label">Password</label><input name="password" type="password" defaultValue="demo1234" className="input" required /></div>
            <button className="btn-primary w-full py-3 text-base">Sign in</button>
          </form>
          <div className="mt-8 card p-4">
            <div className="label">Demo accounts (password: demo1234)</div>
            <ul className="mt-2 space-y-2 text-sm">
              {demo.map(([e, r, d]) => (
                <li key={e} className="flex flex-col"><span className="font-semibold">{e} <span className="pill bg-slate-100 text-slate-700 ml-1">{r}</span></span><span className="text-slate-500">{d}</span></li>
              ))}
            </ul>
          </div>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-orange-700">← Back to the live portal</Link>
        </div>
      </div>
    </div>
  );
}
