import { db, listWorkspaces, getWorkspace } from '@/lib/db';
import { renderEpaper } from '@/lib/render';
import { loadImageDataUri } from '@/lib/media';
export const dynamic = 'force-dynamic';

/** Daily e-paper cover (top stories of the last 24h). Public PNG. ?ws=<id> */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const ws = getWorkspace(Number(u.searchParams.get('ws'))) || listWorkspaces()[0];
  const rows = db().prepare(`SELECT p.headline, p.summary, p.category, i.image_url FROM posts p JOIN items i ON i.id=p.item_id
    WHERE p.ws_id=? AND p.status != 'rejected' AND p.template != 'mandi' AND p.created_at > ?
    ORDER BY CASE p.focus WHEN 'agri' THEN 0 WHEN 'industry' THEN 1 ELSE 2 END, p.score DESC, p.created_at DESC LIMIT 6`).all(ws.id, Date.now() - 36 * 3600e3) as any[];
  const li = rows.findIndex((r) => r.image_url && !/news\.google\./.test(r.image_url));
  if (li > 0) rows.unshift(...rows.splice(li, 1));
  const stories = await Promise.all(rows.map(async (r, i) => ({ headline: r.headline, summary: r.summary, category: r.category, image: i < 3 ? await loadImageDataUri(r.image_url) : null })));
  try {
    const png = await renderEpaper(ws.settings, stories, Date.now());
    const h: Record<string, string> = { 'content-type': 'image/png', 'cache-control': 'public, max-age=120' };
    if (u.searchParams.get('download')) h['content-disposition'] = 'attachment; filename="atthistime-epaper.png"';
    return new Response(new Uint8Array(png), { headers: h });
  } catch (e: any) {
    return new Response(`Render failed: ${e?.message || e}`, { status: 500 });
  }
}
