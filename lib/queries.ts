import { db } from './db';

export type PostRow = {
  id: number; ws_id: number; item_id: number; headline: string; summary: string; caption: string; keywords: string; hashtags: string;
  category: string; focus: string; score: number; lang: string; template: string; status: string; summarizer: string; model: string | null;
  rev: number; created_at: number; updated_at: number; reel_path: string | null; title: string; link: string; publisher: string; published_at: number; image_url: string;
};

export function listPosts(wsId: number, status?: string, limit = 60): PostRow[] {
  const where = status && status !== 'all' ? 'AND p.status=?' : '';
  const args: any[] = [wsId]; if (where) args.push(status); args.push(limit);
  return db().prepare(`SELECT p.*, i.title, i.link, i.publisher, i.published_at, i.image_url FROM posts p JOIN items i ON i.id=p.item_id
    WHERE p.ws_id=? ${where} ORDER BY CASE p.focus WHEN 'agri' THEN 0 WHEN 'industry' THEN 1 ELSE 2 END, p.created_at DESC LIMIT ?`).all(...args) as any;
}

export function portalSections(wsId: number) {
  const q = (focusSql: string, limit: number) => db().prepare(`SELECT i.*, p.id post_id, p.headline, p.summary, p.status, p.rev, p.score FROM items i LEFT JOIN posts p ON p.item_id=i.id AND p.status != 'rejected'
    WHERE i.ws_id=? AND ${focusSql} ORDER BY (p.id IS NOT NULL) DESC, i.priority DESC, i.published_at DESC LIMIT ?`).all(wsId, limit) as any[];
  return {
    agri: q("i.focus='agri' AND i.published_at > " + (Date.now() - 4 * 86400e3), 9),
    industry: q("i.focus='industry' AND i.published_at > " + (Date.now() - 4 * 86400e3), 6),
    rajkot: q("(i.title LIKE '%Rajkot%' OR i.title LIKE '%રાજકોટ%' OR i.title LIKE '%Gondal%' OR i.title LIKE '%ગોંડલ%' OR i.title LIKE '%Saurashtra%' OR i.title LIKE '%સૌરાષ્ટ્ર%' OR i.focus='rajkot')", 6),
    latest: db().prepare('SELECT * FROM items WHERE ws_id=? ORDER BY published_at DESC LIMIT 12').all(wsId) as any[],
  };
}

export function stats(wsId: number) {
  const d = db();
  const one = (sql: string, ...a: any[]) => (d.prepare(sql).get(wsId, ...a) as any)?.c ?? 0;
  return {
    items: one('SELECT COUNT(*) c FROM items WHERE ws_id=?'),
    items24: one('SELECT COUNT(*) c FROM items WHERE ws_id=? AND fetched_at > ?', Date.now() - 86400e3),
    posts: one('SELECT COUNT(*) c FROM posts WHERE ws_id=?'),
    pending: one("SELECT COUNT(*) c FROM posts WHERE ws_id=? AND status='pending'"),
    approved: one("SELECT COUNT(*) c FROM posts WHERE ws_id=? AND status='approved'"),
    rejected: one("SELECT COUNT(*) c FROM posts WHERE ws_id=? AND status='rejected'"),
    agri: one("SELECT COUNT(*) c FROM items WHERE ws_id=? AND focus='agri'"),
    industry: one("SELECT COUNT(*) c FROM items WHERE ws_id=? AND focus='industry'"),
    rajkot: one("SELECT COUNT(*) c FROM items WHERE ws_id=? AND (title LIKE '%Rajkot%' OR title LIKE '%રાજકોટ%')"),
    claude: one("SELECT COUNT(*) c FROM posts WHERE ws_id=? AND summarizer='claude'"),
    ai: one("SELECT COUNT(*) c FROM posts WHERE ws_id=? AND summarizer IN ('gemini','claude')"),
    sources: one('SELECT COUNT(*) c FROM sources WHERE ws_id=? AND enabled=1'),
    runs: one('SELECT COUNT(*) c FROM runs WHERE ws_id=?'),
  };
}

export const recentRuns = (wsId: number, n = 8) => db().prepare('SELECT * FROM runs WHERE ws_id=? ORDER BY id DESC LIMIT ?').all(wsId, n) as any[];
export const activity = (wsId: number, n = 100) => db().prepare('SELECT * FROM activity WHERE ws_id=? OR ws_id IS NULL ORDER BY id DESC LIMIT ?').all(wsId, n) as any[];
export const listItems = (wsId: number, focus?: string, n = 150) => db().prepare(`SELECT i.*, s.name source_name, p.id post_id FROM items i LEFT JOIN sources s ON s.id=i.source_id LEFT JOIN posts p ON p.item_id=i.id
  WHERE i.ws_id=? ${focus && focus !== 'all' ? 'AND i.focus=?' : ''} ORDER BY i.published_at DESC LIMIT ?`).all(...([wsId, ...(focus && focus !== 'all' ? [focus] : []), n])) as any[];
export const listSources = (wsId: number) => db().prepare("SELECT * FROM sources WHERE ws_id=? ORDER BY CASE focus WHEN 'agri' THEN 0 WHEN 'industry' THEN 1 WHEN 'rajkot' THEN 2 ELSE 3 END, id").all(wsId) as any[];
export const listUsers = () => db().prepare('SELECT id, email, name, role, created_at FROM users ORDER BY id').all() as any[];

export function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
export const fmtTime = (ts: number) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ts)) + ' IST';
