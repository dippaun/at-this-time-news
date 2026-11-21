import { guard } from '@/lib/auth';
import { db, DATA_DIR, log } from '@/lib/db';
import { postWithItem, renderReelPng } from '@/lib/pipeline';
import { loadImageDataUri } from '@/lib/media';
import { REEL_BAND } from '@/lib/render';
import { sha } from '@/lib/fetcher';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
const run = promisify(execFile);
type P = { params: Promise<{ id: string }> };
export const maxDuration = 120;

/**
 * 9:16 brand reel (6s, 1080x1920): the story photo slowly zooms inside the middle band,
 * under the AT THIS TIME frame overlay (red headline header, sponsor strip, brand badge, app line).
 */
export async function POST(_: Request, { params }: P) {
  const g = await guard('editor'); if ('res' in g) return g.res;
  const { id } = await params;
  const p = postWithItem(Number(id));
  if (!p) return Response.json({ error: 'not found' }, { status: 404 });
  const dir = path.join(DATA_DIR, 'frames');
  const out = path.join(dir, `${p.id}-${p.rev}-reel.mp4`);
  if (!fs.existsSync(out)) {
    const hasPhoto = !!(await loadImageDataUri(p.image_url));
    const photo = path.join(DATA_DIR, 'media', sha(p.image_url || '') + '.jpg');
    const { top, height } = REEL_BAND;
    if (hasPhoto && fs.existsSync(photo)) {
      const overlay = path.join(dir, `${p.id}-${p.rev}-reel-overlay.png`);
      fs.writeFileSync(overlay, await renderReelPng(p.id, true));
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', photo, '-loop', '1', '-i', overlay, '-filter_complex',
        `[0:v]scale=1296:${Math.round(height * 1.2)}:force_original_aspect_ratio=increase,crop=1296:${Math.round(height * 1.2)},zoompan=z='min(zoom+0.0009,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=180:s=1080x${height}:fps=30[v];` +
        `[v]pad=1080:1920:0:${top}:color=white[bg];[bg][1:v]overlay=0:0:shortest=1,format=yuv420p`,
        '-frames:v', '180', '-c:v', 'libx264', '-preset', 'veryfast', '-movflags', '+faststart', out], { timeout: 110000 });
    } else {
      const full = path.join(dir, `${p.id}-${p.rev}-reel.png`);
      fs.writeFileSync(full, await renderReelPng(p.id, false));
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', full, '-vf', "scale=1080:1920,format=yuv420p", '-t', '6', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-movflags', '+faststart', out], { timeout: 110000 });
    }
  }
  db().prepare('UPDATE posts SET reel_path=? WHERE id=?').run(out, p.id);
  log(p.ws_id, 'success', `9:16 reel MP4 generated for post #${id}`);
  return Response.json({ ok: true, url: `/api/posts/${id}/reel` });
}

export async function GET(_: Request, { params }: P) {
  const { id } = await params;
  const p = db().prepare('SELECT reel_path FROM posts WHERE id=?').get(id) as any;
  if (!p?.reel_path || !fs.existsSync(p.reel_path)) return new Response('Not generated', { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(p.reel_path)), { headers: { 'content-type': 'video/mp4', 'content-disposition': `inline; filename="atthistime-reel-${id}.mp4"` } });
}
