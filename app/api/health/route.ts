import { db, kvGet } from '@/lib/db';
export const dynamic = 'force-dynamic';

/** Public health check for the host / uptime monitors. No secrets. */
export async function GET() {
  try {
    const d = db();
    const n = (sql: string) => (d.prepare(sql).get() as any).c as number;
    return Response.json({
      ok: true,
      uptimeSec: Math.round(process.uptime()),
      stories: n('SELECT COUNT(*) c FROM items'),
      posts: n('SELECT COUNT(*) c FROM posts'),
      withImage: n("SELECT COUNT(*) c FROM items WHERE image_url LIKE '/api/media/%'"),
      mandiRows: n("SELECT COUNT(*) c FROM mandi_rates WHERE source<>''"),
      lastTick: Number(kvGet('last_tick') || 0) || null,
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e).slice(0, 120) }, { status: 500 });
  }
}
