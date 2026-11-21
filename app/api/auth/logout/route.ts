import { SESSION_COOKIE } from '@/lib/auth';
import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  const origin = req.headers.get('x-forwarded-host') ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}` : new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/login`, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
