import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { DATA_DIR } from './db';
import { fetchWithTimeout, sha } from './fetcher';

const run = promisify(execFile);
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
export const LOCAL_PREFIX = '/api/media/';
export const isLocal = (url?: string | null) => !!url && url.startsWith(LOCAL_PREFIX);

/** Path on disk for an image URL: local (/api/media/x.jpg) or the cache file of a remote URL. */
export function mediaFile(url: string): string {
  if (isLocal(url)) return path.join(MEDIA_DIR, path.basename(url.slice(LOCAL_PREFIX.length)));
  return path.join(MEDIA_DIR, sha(url) + '.jpg');
}

/** Normalise any image buffer to a <=1280px JPEG with ffmpeg; optional crop of the bottom (watermark strip). */
export async function writeJpeg(buf: Buffer, out: string, cropBottomPct = 0): Promise<boolean> {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = out + '.src';
  fs.writeFileSync(tmp, buf);
  try {
    const vf = (cropBottomPct ? `crop=iw:trunc(ih*${(1 - cropBottomPct).toFixed(3)}/2)*2:0:0,` : '') + "scale='min(1280,iw)':-2";
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-frames:v', '1', '-vf', vf, '-q:v', '3', out], { timeout: 20000 });
    return fs.existsSync(out) && fs.statSync(out).size > 2000;
  } catch {
    fs.rmSync(out, { force: true });
    return false;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** Make sure an image is cached on disk. Returns the file path or null. */
export async function ensureMedia(url: string): Promise<string | null> {
  if (!url) return null;
  const out = mediaFile(url);
  if (fs.existsSync(out) && fs.statSync(out).size > 2000) return out;
  if (isLocal(url) || !/^https?:/.test(url)) return null;
  try {
    const r = await fetchWithTimeout(url, 10000, { headers: { accept: 'image/*' } });
    if (!r.ok || !/image|octet/.test(r.headers.get('content-type') || 'image')) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 2000) return null; // tracking pixels / tiny logos
    return (await writeJpeg(buf, out)) ? out : null;
  } catch {
    return null;
  }
}

/** Image (publisher-cached or generated) as a data URI for satori frames. */
export async function loadImageDataUri(url: string): Promise<string | null> {
  const f = await ensureMedia(url);
  if (!f) return null;
  try {
    const data = fs.readFileSync(f);
    return data.length < 2000 ? null : 'data:image/jpeg;base64,' + data.toString('base64');
  } catch {
    return null;
  }
}
