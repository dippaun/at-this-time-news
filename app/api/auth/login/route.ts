import { login, SESSION_COOKIE } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const ct = req.headers.get('content-type') || '';
  const body: any = ct.includes('json') ? await req.json() : Object.fromEntries((await req.formData()).entries());
  const token = await login(String(body.email || ''), String(body.password || ''));
  const base = new URL(req.url);
  const origin = req.headers.get('x-forwarded-host') ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}` : base.origin;
  if (!token) return NextResponse.redirect(`${origin}/login?error=1`, 303);
  const res = NextResponse.redirect(`${origin}/dashboard`, 303);
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400, secure: origin.startsWith('https') });
  return res;
}
