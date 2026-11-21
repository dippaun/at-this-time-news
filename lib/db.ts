import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DEFAULT_SOURCES } from './sources';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
fs.mkdirSync(path.join(DATA_DIR, 'frames'), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'media'), { recursive: true });

export type WorkspaceSettings = {
  brandName: string;
  handle: string;
  tagline: string;
  primary: string;
  accent: string;
  logoUrl: string; // data: URI or https URL; empty => text logo
  language: 'en' | 'gu';
  template: 'breaking' | 'clean' | 'mandi';
  maxPerRun: number;
  model: string;
  autoApproveScore: number; // 0 = off
};

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  brandName: 'Gujarat Live',
  handle: '@gujaratlive.news',
  tagline: 'ખેતી · ઉદ્યોગ · ગુજરાત',
  primary: '#D9480F',
  accent: '#FACC15',
  logoUrl: '',
  language: 'gu',
  template: 'breaking',
  maxPerRun: Number(process.env.MAX_ITEMS_PER_RUN || 10),
  model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
  autoApproveScore: 0,
};

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
  `);
  seed(db);
}

function seed(db: Database.Database) {
  const n = db.prepare('SELECT COUNT(*) c FROM workspaces').get() as any;
  if (n.c === 0) {
    const ws = db.prepare('INSERT INTO workspaces (name, slug, settings, created_at) VALUES (?,?,?,?)')
      .run('Gujarat News', 'gujarat-news', JSON.stringify(DEFAULT_SETTINGS), Date.now());
    addDefaultSources(db, Number(ws.lastInsertRowid));
  }
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
  return { id: r.id, name: r.name, slug: r.slug, settings: { ...DEFAULT_SETTINGS, ...JSON.parse(r.settings || '{}') } };
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
