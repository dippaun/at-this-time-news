import { guard } from '@/lib/auth';
import { db, DATA_DIR, log } from '@/lib/db';
import { renderPost, framePath } from '@/lib/pipeline';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
const run = promisify(execFile);
type P = { params: Promise<{ id: string }> };
export const maxDuration = 120;

/** Make a 6s 1080x1350 MP4 "reel" (slow zoom over the frame) with ffmpeg. */
export async function POST(_: Request, { params }: P) {
  const g = await guard('editor'); if ('res' in g) return g.res;
  const { id } = await params;
  const p = db().prepare('SELECT * FROM posts WHERE id=?').get(id) as any;
  if (!p) return Response.json({ error: 'not found' }, { status: 404 });
  let png = framePath(p.id, p.rev);
  if (!fs.existsSync(png)) png = await renderPost(p.id);
  const out = path.join(DATA_DIR, 'frames', `${p.id}-${p.rev}.mp4`);
  if (!fs.existsSync(out)) {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', png, '-vf',
      "scale=2160:2700,zoompan=z='min(zoom+0.0007,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=180:s=1080x1350:fps=30,format=yuv420p",
      '-t', '6', '-c:v', 'libx264', '-preset', 'veryfast', '-movflags', '+faststart', out], { timeout: 110000 });
  }
  db().prepare('UPDATE posts SET reel_path=? WHERE id=?').run(out, p.id);
  log(p.ws_id, 'success', `Reel MP4 generated for post #${id}`);
  return Response.json({ ok: true, url: `/api/posts/${id}/reel` });
}

export async function GET(_: Request, { params }: P) {
  const { id } = await params;
  const p = db().prepare('SELECT reel_path FROM posts WHERE id=?').get(id) as any;
  if (!p?.reel_path || !fs.existsSync(p.reel_path)) return new Response('Not generated', { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(p.reel_path)), { headers: { 'content-type': 'video/mp4', 'content-disposition': `inline; filename="reel-${id}.mp4"` } });
}
