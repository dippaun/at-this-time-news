import { getSession } from '@/lib/auth';
import { getWorkspace } from '@/lib/db';
import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  if (!(await getSession())) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  if (!getWorkspace(Number(id))) return Response.json({ error: 'not found' }, { status: 404 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set('gns_ws', String(id), { path: '/', sameSite: 'lax', maxAge: 365 * 86400 });
  return res;
}
