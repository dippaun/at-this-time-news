import { guard } from '@/lib/auth';
import { db, log } from '@/lib/db';
import { renderPost, createPostForItem } from '@/lib/pipeline';
import { publishToInstagram } from '@/lib/instagram';
type P = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: P) {
  const g = await guard('editor'); if ('res' in g) return g.res;
  const { id } = await params;
  const p = db().prepare('SELECT * FROM posts WHERE id=?').get(id) as any;
  if (!p) return Response.json({ error: 'not found' }, { status: 404 });
  const b = await req.json();
  const d = db();
  if (b.status && ['pending', 'approved', 'rejected'].includes(b.status)) {
    d.prepare('UPDATE posts SET status=?, updated_at=? WHERE id=?').run(b.status, Date.now(), id);
    log(p.ws_id, b.status === 'approved' ? 'success' : 'info', `Post #${id} ${b.status} by ${g.s.email}`);
  }
  const visual = ['headline', 'summary', 'keywords', 'template'].some((k) => k in b);
  if (visual || 'caption' in b || 'hashtags' in b) {
    const kw = Array.isArray(b.keywords) ? b.keywords : typeof b.keywords === 'string' ? b.keywords.split(',').map((s: string) => s.trim()).filter(Boolean) : JSON.parse(p.keywords || '[]');
    d.prepare('UPDATE posts SET headline=?, summary=?, caption=?, keywords=?, template=?, rev=rev+?, updated_at=? WHERE id=?')
      .run(b.headline ?? p.headline, b.summary ?? p.summary, b.caption ?? p.caption, JSON.stringify(kw), b.template ?? p.template, visual ? 1 : 0, Date.now(), id);
    if (visual) await renderPost(Number(id));
    log(p.ws_id, 'info', `Post #${id} edited by ${g.s.email}${visual ? ' (frame re-rendered)' : ''}`);
  }
  return Response.json({ ok: true, post: d.prepare('SELECT * FROM posts WHERE id=?').get(id) });
}

/** Actions: regenerate (re-summarise, optional lang) | instagram (stub) */
export async function POST(req: Request, { params }: P) {
  const g = await guard('editor'); if ('res' in g) return g.res;
  const { id } = await params;
  const p = db().prepare('SELECT * FROM posts WHERE id=?').get(id) as any;
  if (!p) return Response.json({ error: 'not found' }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  if (b.action === 'instagram') return Response.json(await publishToInstagram(Number(id)), { status: 501 });
  await createPostForItem(p.ws_id, p.item_id, b.lang === 'gu' || b.lang === 'en' ? b.lang : undefined);
  log(p.ws_id, 'info', `Post #${id} regenerated${b.lang ? ` in ${b.lang === 'gu' ? 'Gujarati' : 'English'}` : ''} by ${g.s.email}`);
  return Response.json({ ok: true, post: db().prepare('SELECT * FROM posts WHERE id=?').get(id) });
}
