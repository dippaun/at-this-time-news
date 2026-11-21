import { guard } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
export async function POST(req: Request) {
  const g = await guard('admin'); if ('res' in g) return g.res;
  const b = await req.json();
  if (!b.email || !b.password || String(b.password).length < 6) return Response.json({ error: 'Email and 6+ char password required' }, { status: 400 });
  if (!['admin', 'editor', 'viewer'].includes(b.role)) return Response.json({ error: 'Invalid role' }, { status: 400 });
  try {
    db().prepare('INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?,?,?,?,?)').run(String(b.email).toLowerCase().trim(), b.name || b.email, bcrypt.hashSync(b.password, 10), b.role, Date.now());
  } catch { return Response.json({ error: 'User already exists' }, { status: 400 }); }
  return Response.json({ ok: true });
}
