import { guard } from '@/lib/auth';
import { db, log } from '@/lib/db';
import { createPostForItem } from '@/lib/pipeline';
type P = { params: Promise<{ id: string }> };
export async function POST(_: Request, { params }: P) {
  const g = await guard('editor'); if ('res' in g) return g.res;
  const { id } = await params;
  const it = db().prepare('SELECT * FROM items WHERE id=?').get(id) as any;
  if (!it) return Response.json({ error: 'not found' }, { status: 404 });
  const postId = await createPostForItem(it.ws_id, it.id);
  log(it.ws_id, 'info', `Post #${postId} generated manually from feed by ${g.s.email}`);
  return Response.json({ ok: true, postId });
}
