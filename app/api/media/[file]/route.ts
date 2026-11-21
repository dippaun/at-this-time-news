import fs from 'fs';
import path from 'path';
import { MEDIA_DIR } from '@/lib/media';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[\w.-]+\.jpg$/.test(file)) return new Response('bad name', { status: 400 });
  const f = path.join(MEDIA_DIR, path.basename(file));
  if (!fs.existsSync(f)) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(f)), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
}
