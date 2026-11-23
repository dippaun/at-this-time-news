// Compact the SQLite state before it is pushed to the public `data` branch, and prune unreferenced media.
const fs = require('fs');
const path = require('path');
const D = require('better-sqlite3');
const dir = process.env.DATA_DIR || 'data';
const d = new D(path.join(dir, 'app.db'));
const now = Date.now();
d.prepare('DELETE FROM items WHERE published_at < ? AND id NOT IN (SELECT item_id FROM posts WHERE item_id IS NOT NULL)').run(now - 14 * 86400e3);
d.prepare('DELETE FROM activity WHERE ts < ?').run(now - 5 * 86400e3);
d.prepare('DELETE FROM runs WHERE started_at < ?').run(now - 5 * 86400e3);
d.prepare("DELETE FROM kv WHERE k = 'auth_secret'").run(); // server session secret is never published
d.pragma('wal_checkpoint(TRUNCATE)');
d.exec('VACUUM');
const keep = new Set(d.prepare("SELECT image_url u FROM items WHERE image_url LIKE '/api/media/%'").all().map((r) => r.u.split('/').pop()));
d.close();
let n = 0;
const media = path.join(dir, 'media');
if (fs.existsSync(media)) for (const f of fs.readdirSync(media)) if (!keep.has(f)) { fs.rmSync(path.join(media, f)); n++; }
console.log(`db ${(fs.statSync(path.join(dir, 'app.db')).size / 1e6).toFixed(1)} MB, media kept ${keep.size}, pruned ${n}`);
