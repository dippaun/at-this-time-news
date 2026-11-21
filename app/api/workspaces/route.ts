import { guard } from '@/lib/auth';
import { db, DEFAULT_SETTINGS, addDefaultSources, log } from '@/lib/db';
export async function POST(req: Request) {
  const g = await guard('admin'); if ('res' in g) return g.res;
  const b = await req.json();
  const name = String(b.name || '').trim();
  if (!name) return Response.json({ error: 'Name required' }, { status: 400 });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
  const r = db().prepare('INSERT INTO workspaces (name, slug, settings, created_at) VALUES (?,?,?,?)').run(name, slug, JSON.stringify({ ...DEFAULT_SETTINGS, brandName: name }), Date.now());
  const id = Number(r.lastInsertRowid);
  if (b.copySources) addDefaultSources(db(), id);
  log(id, 'info', `Workspace "${name}" created by ${g.s.email}`);
  return Response.json({ ok: true, id });
}
