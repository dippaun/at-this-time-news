import { db, getWorkspace } from '@/lib/db';
import { renderPost, framePath } from '@/lib/pipeline';
import { renderFrame } from '@/lib/render';
import { loadImageDataUri } from '@/lib/media';
import fs from 'fs';
export const dynamic = 'force-dynamic';
type P = { params: Promise<{ id: string }> };

/** Public PNG of a post's frame. ?tpl= renders a live preview with another template (not saved). ?download=1 forces download. */
export async function GET(req: Request, { params }: P) {
  const { id } = await params;
  const u = new URL(req.url);
  const p = db().prepare('SELECT p.*, i.image_url, i.publisher, i.published_at, i.title FROM posts p JOIN items i ON i.id=p.item_id WHERE p.id=?').get(id) as any;
  if (!p) return new Response('Not found', { status: 404 });
  let png: Buffer;
  const tpl = u.searchParams.get('tpl');
  if (tpl && tpl !== p.template) {
    const ws = getWorkspace(p.ws_id)!;
    png = await renderFrame(tpl, ws.settings, {
      headline: p.headline, summary: p.summary, keywords: JSON.parse(p.keywords || '[]'), category: p.category, focus: p.focus,
      source: p.publisher, publishedAt: p.published_at, image: await loadImageDataUri(p.image_url), lang: p.lang, rajkot: /rajkot|રાજકોટ/i.test(p.title),
    });
  } else {
    let f = framePath(p.id, p.rev);
    if (!fs.existsSync(f)) f = await renderPost(p.id);
    png = fs.readFileSync(f);
  }
  const headers: Record<string, string> = { 'content-type': 'image/png', 'cache-control': 'public, max-age=60' };
  if (u.searchParams.get('download')) headers['content-disposition'] = `attachment; filename="gujarat-post-${id}.png"`;
  return new Response(new Uint8Array(png), { headers });
}
