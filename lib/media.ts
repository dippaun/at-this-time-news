import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { DATA_DIR } from './db';
import { fetchWithTimeout, sha } from './fetcher';

const run = promisify(execFile);

/** Download an image, normalise it to a <=1080px JPEG with ffmpeg (handles webp/avif) and return a data URI. */
export async function loadImageDataUri(url: string): Promise<string | null> {
  if (!url || !/^https?:/.test(url)) return null;
  const out = path.join(DATA_DIR, 'media', sha(url) + '.jpg');
  try {
    if (!fs.existsSync(out)) {
      const r = await fetchWithTimeout(url, 10000, { headers: { accept: 'image/*' } });
      if (!r.ok) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 2000) return null; // tracking pixels / tiny logos
      const tmp = out + '.src';
      fs.writeFileSync(tmp, buf);
      try {
        await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-frames:v', '1', '-vf', "scale='min(1080,iw)':-2", '-q:v', '4', out], { timeout: 20000 });
      } finally {
        fs.rmSync(tmp, { force: true });
      }
    }
    const data = fs.readFileSync(out);
    if (data.length < 2000) return null;
    return 'data:image/jpeg;base64,' + data.toString('base64');
  } catch {
    return null;
  }
}
