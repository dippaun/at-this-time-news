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

// ---------- Portal (public) ----------
export type Story = {
  id: number; post_id: number | null; title: string; summary: string; image_url: string | null; publisher: string; link: string;
  published_at: number; focus: string; category: string; score: number | null; lang: string; keywords: string | null; template: string | null; rev: number | null;
};
export const CITIES: { key: string; en: string; gu: string }[] = [
  { key: 'rajkot', en: 'Rajkot', gu: 'રાજકોટ' }, { key: 'gondal', en: 'Gondal', gu: 'ગોંડલ' }, { key: 'jasdan', en: 'Jasdan', gu: 'જસદણ' },
  { key: 'jamnagar', en: 'Jamnagar', gu: 'જામનગર' }, { key: 'junagadh', en: 'Junagadh', gu: 'જુનાગઢ' }, { key: 'morbi', en: 'Morbi', gu: 'મોરબી' },
  { key: 'amreli', en: 'Amreli', gu: 'અમરેલી' }, { key: 'bhavnagar', en: 'Bhavnagar', gu: 'ભાવનગર' }, { key: 'ahmedabad', en: 'Ahmedabad', gu: 'અમદાવાદ' },
  { key: 'surat', en: 'Surat', gu: 'સુરત' }, { key: 'vadodara', en: 'Vadodara', gu: 'વડોદરા' }, { key: 'kutch', en: 'Kutch', gu: 'કચ્છ' },
];
const STORY_SELECT = `SELECT i.id, p.id post_id, COALESCE(p.headline, i.title) title, COALESCE(NULLIF(p.summary,''), i.description, '') summary, i.image_url, i.publisher, i.link,
  i.published_at, i.focus, COALESCE(p.category, i.category) category, p.score, COALESCE(p.lang, i.lang) lang, p.keywords, p.template, p.rev
  FROM items i LEFT JOIN posts p ON p.item_id=i.id AND p.status != 'rejected'`;

export function portalFeed(wsId: number, o: { focus?: string; city?: string; q?: string; limit?: number; days?: number } = {}): Story[] {
  const where: string[] = ['i.ws_id=?', 'i.processed != 3'];
  const args: any[] = [wsId];
  if (o.days) { where.push('i.published_at > ?'); args.push(Date.now() - o.days * 86400e3); }
  if (o.focus && o.focus !== 'all') { where.push('i.focus=?'); args.push(o.focus); }
  const c = CITIES.find((x) => x.key === o.city);
  if (c) { where.push('(i.title LIKE ? OR i.title LIKE ? OR p.headline LIKE ? OR i.description LIKE ?)'); args.push(`%${c.en}%`, `%${c.gu}%`, `%${c.gu}%`, `%${c.en}%`); }
  if (o.q) { where.push('(i.title LIKE ? OR p.headline LIKE ? OR p.summary LIKE ?)'); args.push(`%${o.q}%`, `%${o.q}%`, `%${o.q}%`); }
  args.push(o.limit ?? 24);
  return db().prepare(`${STORY_SELECT} WHERE ${where.join(' AND ')} ORDER BY (p.id IS NOT NULL) DESC, (i.image_url IS NOT NULL AND i.image_url != '') DESC,
    (i.priority + CASE WHEN i.published_at > ${Date.now() - 12 * 3600e3} THEN 3 ELSE 0 END) DESC, i.published_at DESC LIMIT ?`).all(...args) as Story[];
}
export function latestStories(wsId: number, n = 14): Story[] {
  return db().prepare(`${STORY_SELECT} WHERE i.ws_id=? AND i.processed != 3 ORDER BY (p.id IS NOT NULL) DESC, i.published_at DESC LIMIT ?`).all(wsId, n) as Story[];
}
export function storyById(id: number): (Story & { ws_id: number; source_name: string | null; caption: string | null }) | null {
  return (db().prepare(`SELECT i.ws_id, s.name source_name, p.caption, x.* FROM (${STORY_SELECT} WHERE i.id=?) x JOIN items i ON i.id=x.id LEFT JOIN sources s ON s.id=i.source_id LEFT JOIN posts p ON p.id=x.post_id`).get(id) as any) || null;
}
export function relatedStories(wsId: number, focus: string, exclude: number, n = 4): Story[] {
  return db().prepare(`${STORY_SELECT} WHERE i.ws_id=? AND i.focus=? AND i.id != ? AND i.processed != 3 ORDER BY (p.id IS NOT NULL) DESC, i.published_at DESC LIMIT ?`).all(wsId, focus, exclude, n) as Story[];
}

// ---------- Dashboard series ----------
/** Hourly buckets for the last `hours` hours. */
export function series(wsId: number, hours = 24) {
  const start = Date.now() - hours * 3600e3;
  const bucket = (rows: { t: number }[]) => { const a = Array(hours).fill(0); for (const r of rows) { const i = Math.floor((r.t - start) / 3600e3); if (i >= 0 && i < hours) a[i]++; } return a; };
  const d = db();
  const items = d.prepare('SELECT fetched_at t, focus FROM items WHERE ws_id=? AND fetched_at > ?').all(wsId, start) as any[];
  const posts = d.prepare('SELECT created_at t, summarizer, status FROM posts WHERE ws_id=? AND created_at > ?').all(wsId, start) as any[];
  return {
    items: bucket(items), agri: bucket(items.filter((x) => x.focus === 'agri')), industry: bucket(items.filter((x) => x.focus === 'industry')),
    posts: bucket(posts), ai: bucket(posts.filter((x) => x.summarizer !== 'extractive')), pending: bucket(posts.filter((x) => x.status === 'pending')),
  };
}
export function templateCounts(wsId: number) {
  return Object.fromEntries((db().prepare('SELECT template, COUNT(*) c FROM posts WHERE ws_id=? GROUP BY template').all(wsId) as any[]).map((r) => [r.template, r.c])) as Record<string, number>;
}
