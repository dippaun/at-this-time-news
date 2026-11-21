import { getWorkspace } from '@/lib/db';
import { renderPost, framePath, postWithItem, frameDataForPost, renderReelPng, normTpl, ratesForPost } from '@/lib/pipeline';
import { renderFrame } from '@/lib/render';
import fs from 'fs';
export const dynamic = 'force-dynamic';
type P = { params: Promise<{ id: string }> };

/**
 * Public PNG of a post's frame.
 *  ?tpl=news|story|mandi  live preview with another template (not saved)
 *  ?format=reel           9:16 reel frame (1080x1920)
 *  ?download=1            force download
 */
export async function GET(req: Request, { params }: P) {
  const { id } = await params;
  const u = new URL(req.url);
  const p = postWithItem(Number(id));
  if (!p) return new Response('Not found', { status: 404 });
  const tpl = u.searchParams.get('tpl');
  const reel = u.searchParams.get('format') === 'reel';
  let png: Buffer;
  try {
    if (reel) png = await renderReelPng(p.id);
    else if (tpl && normTpl(tpl) !== normTpl(p.template)) {
      const fd = await frameDataForPost(p);
      if (normTpl(tpl) === 'mandi') fd.rates = ratesForPost(p);
      png = await renderFrame(normTpl(tpl), getWorkspace(p.ws_id)!.settings, fd);
    } else {
      let f = framePath(p.id, p.rev);
      if (!fs.existsSync(f)) f = await renderPost(p.id);
      png = fs.readFileSync(f);
    }
  } catch (e: any) {
    console.error('[frame] render failed', id, tpl, e);
    return new Response(`Render failed: ${e?.message || e}`, { status: 500 });
  }
  const headers: Record<string, string> = { 'content-type': 'image/png', 'cache-control': 'public, max-age=60' };
  if (u.searchParams.get('download')) headers['content-disposition'] = `attachment; filename="atthistime-${reel ? 'reel' : normTpl(tpl || p.template)}-${id}.png"`;
  return new Response(new Uint8Array(png), { headers });
}
