import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DEFAULT_SOURCES } from './sources';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
fs.mkdirSync(path.join(DATA_DIR, 'frames'), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'media'), { recursive: true });

export type TemplateId = 'news' | 'story' | 'mandi';
export type WorkspaceSettings = {
  settingsVersion: number;
  brandName: string; // e.g. AT THIS TIME
  brandTag: string; // e.g. MEDIA
  handle: string;
  tagline: string;
  primary: string; // brand red
  accent: string; // navy
  logoUrl: string; // data: URI or https URL; empty => megaphone mark
  whatsapp: string;
  location: string; // city pill, e.g. જસદણ / રાજકોટ
  cityTag: string; // extra hashtag, e.g. #Jasdan
  sponsorUrl: string; // sponsor banner image (data URI / URL); empty => placeholder
  appLine: string;
  newspaperName: string; // e-paper masthead
  newspaperTagline: string;
  reporterDefault: string;
  language: 'en' | 'gu';
  template: 'auto' | TemplateId;
  maxPerRun: number;
  model: string; // Claude model
  aiProvider: 'auto' | 'gemini' | 'claude' | 'extractive';
  geminiModel: string;
  autoApproveScore: number; // 0 = off
};

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  settingsVersion: 2,
  brandName: 'AT THIS TIME',
  brandTag: 'MEDIA',
  handle: '@at_this_time_jasdan',
  tagline: 'જસદણ · રાજકોટ · ગુજરાત',
  primary: '#E31E24',
  accent: '#1B2A5C',
  logoUrl: '',
  whatsapp: '72038 88088',
  location: 'જસદણ',
  cityTag: '#Jasdan',
  sponsorUrl: '',
  appLine: 'વિગતવાર સમાચાર મેળવવા માટે AT THIS TIME NEWS એપ ડાઉનલોડ કરો',
  newspaperName: 'એટ ધીસ ટાઈમ',
  newspaperTagline: 'AT THIS TIME (DAILY)',
  reporterDefault: '',
  language: 'gu',
  template: 'auto',
  maxPerRun: Number(process.env.MAX_ITEMS_PER_RUN || 10),
  model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
  aiProvider: (process.env.AI_PROVIDER as any) || 'auto',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  autoApproveScore: 0,
};

// Brand keys reset when upgrading settings from v1 (old demo brand) to v2 (AT THIS TIME brand system)
const V2_KEYS: (keyof WorkspaceSettings)[] = ['brandName', 'brandTag', 'handle', 'tagline', 'primary', 'accent', 'whatsapp', 'location', 'cityTag', 'appLine', 'newspaperName', 'newspaperTagline', 'template', 'language', 'settingsVersion'];

const g = globalThis as any;

function init(db: Database.Database) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (id INTEGER PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE, settings TEXT NOT NULL, created_at INTEGER);
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer')), created_at INTEGER);
  CREATE TABLE IF NOT EXISTS sources (id INTEGER PRIMARY KEY, ws_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name TEXT, url TEXT NOT NULL, lang TEXT DEFAULT 'en', focus TEXT DEFAULT 'general', enabled INTEGER DEFAULT 1, last_status TEXT, last_count INTEGER DEFAULT 0, last_fetched_at INTEGER);
  CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, ws_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, source_id INTEGER, link_hash TEXT, title_hash TEXT, title TEXT, link TEXT, description TEXT, publisher TEXT, image_url TEXT, lang TEXT, published_at INTEGER, fetched_at INTEGER, category TEXT, focus TEXT, priority REAL DEFAULT 0, processed INTEGER DEFAULT 0, UNIQUE(ws_id, link_hash));
  CREATE INDEX IF NOT EXISTS idx_items_title ON items(ws_id, title_hash);
  CREATE INDEX IF NOT EXISTS idx_items_pub ON items(ws_id, published_at DESC);
  CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, ws_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, item_id INTEGER REFERENCES items(id) ON DELETE CASCADE, headline TEXT, summary TEXT, caption TEXT, keywords TEXT, hashtags TEXT, category TEXT, focus TEXT, score REAL, lang TEXT, template TEXT, status TEXT DEFAULT 'pending', summarizer TEXT, model TEXT, image_path TEXT, reel_path TEXT, rev INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER);
  CREATE INDEX IF NOT EXISTS idx_posts_ws ON posts(ws_id, status, created_at DESC);
  CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY, ws_id INTEGER, ts INTEGER, level TEXT, msg TEXT);
  CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY, ws_id INTEGER, trigger TEXT, started_at INTEGER, finished_at INTEGER, fetched INTEGER DEFAULT 0, new_items INTEGER DEFAULT 0, posts INTEGER DEFAULT 0, status TEXT, error TEXT);
  CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
  CREATE TABLE IF NOT EXISTS mandi_rates (id INTEGER PRIMARY KEY, ws_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, yard TEXT, date TEXT, commodity TEXT, min_price REAL, max_price REAL, unit TEXT DEFAULT '20 કિલો', item_id INTEGER, sample INTEGER DEFAULT 0, created_at INTEGER);
  CREATE INDEX IF NOT EXISTS idx_rates ON mandi_rates(ws_id, date DESC);
  `);
  const cols = (db.prepare('PRAGMA table_info(posts)').all() as any[]).map((c) => c.name);
  if (!cols.includes('reporter')) db.exec("ALTER TABLE posts ADD COLUMN reporter TEXT DEFAULT ''");
  if (!cols.includes('flags')) db.exec("ALTER TABLE posts ADD COLUMN flags TEXT DEFAULT '{}'");
  seed(db);
}

function seed(db: Database.Database) {
  const n = db.prepare('SELECT COUNT(*) c FROM workspaces').get() as any;
  if (n.c === 0) {
    const ws = db.prepare('INSERT INTO workspaces (name, slug, settings, created_at) VALUES (?,?,?,?)')
      .run('Gujarat News', 'gujarat-news', JSON.stringify(DEFAULT_SETTINGS), Date.now());
    addDefaultSources(db, Number(ws.lastInsertRowid));
  }
  seedSampleRates(db);
  const u = db.prepare('SELECT COUNT(*) c FROM users').get() as any;
  if (u.c === 0) {
    const ins = db.prepare('INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?,?,?,?,?)');
    const h = bcrypt.hashSync('demo1234', 10);
    ins.run('admin@demo.com', 'Demo Admin', h, 'admin', Date.now());
    ins.run('editor@demo.com', 'Demo Editor', h, 'editor', Date.now());
    ins.run('viewer@demo.com', 'Demo Viewer', h, 'viewer', Date.now());
  }
}

export function addDefaultSources(db: Database.Database, wsId: number) {
  const ins = db.prepare('INSERT INTO sources (ws_id, name, url, lang, focus, enabled) VALUES (?,?,?,?,?,1)');
  for (const s of DEFAULT_SOURCES) ins.run(wsId, s.name, s.url, s.lang, s.focus);
}

export function db(): Database.Database {
  if (!g.__gnsDb) {
    const d = new Database(path.join(DATA_DIR, 'app.db'));
    init(d);
    g.__gnsDb = d;
  }
  return g.__gnsDb;
}

export function getSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const d = db();
  const row = d.prepare("SELECT v FROM kv WHERE k='auth_secret'").get() as any;
  if (row) return row.v;
  const s = crypto.randomBytes(32).toString('hex');
  d.prepare("INSERT INTO kv (k, v) VALUES ('auth_secret', ?)").run(s);
  return s;
}

export function kvGet(k: string): string | null {
  const r = db().prepare('SELECT v FROM kv WHERE k=?').get(k) as any;
  return r ? r.v : null;
}
export function kvSet(k: string, v: string) {
  db().prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, v);
}

export type Workspace = { id: number; name: string; slug: string; settings: WorkspaceSettings };

export function listWorkspaces(): Workspace[] {
  return (db().prepare('SELECT * FROM workspaces ORDER BY id').all() as any[]).map(rowToWs);
}
export function getWorkspace(id: number): Workspace | null {
  const r = db().prepare('SELECT * FROM workspaces WHERE id=?').get(id) as any;
  return r ? rowToWs(r) : null;
}
function rowToWs(r: any): Workspace {
  const saved = JSON.parse(r.settings || '{}');
  if ((saved.settingsVersion || 1) < 2) for (const k of V2_KEYS) delete saved[k];
  return { id: r.id, name: r.name, slug: r.slug, settings: { ...DEFAULT_SETTINGS, ...saved } };
}
export function saveSettings(id: number, s: Partial<WorkspaceSettings>) {
  const ws = getWorkspace(id);
  if (!ws) return;
  db().prepare('UPDATE workspaces SET settings=? WHERE id=?').run(JSON.stringify({ ...ws.settings, ...s }), id);
}

export function log(wsId: number | null, level: 'info' | 'warn' | 'error' | 'success', msg: string) {
  db().prepare('INSERT INTO activity (ws_id, ts, level, msg) VALUES (?,?,?,?)').run(wsId, Date.now(), level, msg);
  console.log(`[${new Date().toISOString()}] [ws ${wsId}] ${level.toUpperCase()} ${msg}`);
}

/** Example APMC rates (clearly flagged sample=1) so the market-rate card works before real data is extracted. */
export function seedSampleRates(db: Database.Database) {
  const wsIds = (db.prepare('SELECT id FROM workspaces').all() as any[]).map((w) => w.id);
  const rows: [string, number, number][] = [['કપાસ', 1420, 1655], ['મગફળી (જાડી)', 1050, 1325], ['મગફળી (જીણી)', 1080, 1290], ['જીરું', 3850, 4460], ['ઘઉં', 482, 560], ['ચણા', 1040, 1210], ['તલ', 2120, 2510], ['ડુંગળી', 200, 800], ['લસણ', 900, 1820], ['એરંડા', 1180, 1242], ['સોયાબીન', 820, 905], ['બાજરી', 420, 525], ['મગ', 1310, 1660], ['અડદ', 1150, 1480]];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  for (const id of wsIds) {
    const has = db.prepare('SELECT 1 FROM mandi_rates WHERE ws_id=? LIMIT 1').get(id);
    if (has) continue;
    const ins = db.prepare('INSERT INTO mandi_rates (ws_id, yard, date, commodity, min_price, max_price, unit, sample, created_at) VALUES (?,?,?,?,?,?,?,1,?)');
    for (const [c, a, b] of rows) ins.run(id, 'જસદણ', today, c, a, b, '20 કિલો', Date.now());
  }
}

export type RateSet = { yard: string; date: string; unit: string; sample: boolean; rows: { commodity: string; min: number; max: number }[] };
export function latestRates(wsId: number, yard?: string): RateSet | null {
  const d = db();
  const pick = (sample: number) => d.prepare(`SELECT yard, date FROM mandi_rates WHERE ws_id=? AND sample=? ${yard ? 'AND yard=?' : ''} ORDER BY date DESC, id DESC LIMIT 1`).get(...[wsId, sample, ...(yard ? [yard] : [])]) as any;
  const head = pick(0) || pick(1);
  if (!head) return null;
  const rows = d.prepare('SELECT commodity, min_price, max_price, unit, sample FROM mandi_rates WHERE ws_id=? AND yard=? AND date=? ORDER BY sample, id LIMIT 16').all(wsId, head.yard, head.date) as any[];
  return { yard: head.yard, date: head.date, unit: rows[0]?.unit || '20 કિલો', sample: !!rows[0]?.sample, rows: rows.map((r) => ({ commodity: r.commodity, min: r.min_price, max: r.max_price })) };
}
