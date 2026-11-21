import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db, getSecret, listWorkspaces } from './db';

export type Role = 'admin' | 'editor' | 'viewer';
export type Session = { uid: number; email: string; name: string; role: Role };
const COOKIE = 'gns_session';
const RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };

const key = () => new TextEncoder().encode(getSecret());

export async function login(email: string, password: string): Promise<string | null> {
  const u = db().prepare('SELECT * FROM users WHERE email=?').get(String(email).toLowerCase().trim()) as any;
  if (!u || !bcrypt.compareSync(password, u.password_hash)) return null;
  return new SignJWT({ uid: u.id, email: u.email, name: u.name, role: u.role })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(key());
}

export async function getSession(): Promise<Session | null> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c, key());
    const u = db().prepare('SELECT id, email, name, role FROM users WHERE id=?').get(payload.uid as number) as any;
    if (!u) return null;
    return { uid: u.id, email: u.email, name: u.name, role: u.role };
  } catch {
    return null;
  }
}

export const can = (s: Session | null, need: Role) => !!s && RANK[s.role] >= RANK[need];

export async function currentWsId(): Promise<number> {
  const v = Number((await cookies()).get('gns_ws')?.value);
  const all = listWorkspaces();
  return all.find((w) => w.id === v)?.id ?? all[0].id;
}

export const SESSION_COOKIE = COOKIE;

/** For API routes: returns session or a Response to return early. */
export async function guard(need: Role): Promise<{ s: Session } | { res: Response }> {
  const s = await getSession();
  if (!s) return { res: Response.json({ error: 'Not logged in' }, { status: 401 }) };
  if (!can(s, need)) return { res: Response.json({ error: `Requires ${need} role` }, { status: 403 }) };
  return { s };
}
