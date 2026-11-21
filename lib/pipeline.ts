import fs from 'fs';
import path from 'path';
import { DATA_DIR, db, getWorkspace, log, latestRates, type RateSet, type WorkspaceSettings } from './db';
import { fetchSources, enrichFromPage, resolveGoogleNews } from './fetcher';
import { summarize, aiStatus, scrubSource } from './summarize';
import { kvGet, kvSet } from './db';
import { renderFrame, renderReelFrame, FrameData } from './render';
import { loadImageDataUri } from './media';

const g = globalThis as any;
g.__gnsRunning = g.__gnsRunning || new Set<number>();
const noEmoji = (s: string) => (s || '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();

export function framePath(postId: number, rev: number) {
  return path.join(DATA_DIR, 'frames', `${postId}-${rev}.png`);
}

const MANDI_RE = /(યાર્ડ|apmc|એપીએમસી|mandi|મંડી|market yard|marketing yard|બજાર ભાવ|ભાવ|price|rate)/i;
const RAJKOT_RE = /rajkot|રાજકોટ|gondal|ગોંડલ|saurashtra|સૌરાષ્ટ્ર|jasdan|જસદણ/i;
export const TEMPLATE_IDS = ['news', 'story', 'mandi'];
export const normTpl = (t?: string) => (TEMPLATE_IDS.includes(t || '') ? (t as string) : 'news');

/** Auto-pick the brand template per story: mandi/price -> market-rate card, person-centric -> story card, else news card. */
export function pickTemplate(it: any, sm: { person?: boolean; rates?: any[]; yard?: string }, hasImage: boolean, forced?: string) {
  if (forced && forced !== 'auto') return normTpl(forced);
  if ((sm.rates && sm.rates.length >= 2) || (it.focus === 'agri' && /(યાર્ડ|apmc|એપીએમસી|mandi|મંડી|market yard)/i.test(it.title) && /(ભાવ|price|rate|આવક|arrival)/i.test(it.title))) return 'mandi';
  if (sm.person && hasImage) return 'story';
  return 'news';
}

export function ratesForPost(p: any): RateSet | null {
  const d = db();
  const own = d.prepare('SELECT yard, date, unit FROM mandi_rates WHERE item_id=? AND sample=0 LIMIT 1').get(p.item_id) as any;
  if (own) return latestRates(p.ws_id, own.yard);
  const flags = JSON.parse(p.flags || '{}');
  return (flags.yard && latestRates(p.ws_id, flags.yard)) || latestRates(p.ws_id);
}

export async function frameDataForPost(p: any): Promise<FrameData> {
  return {
    headline: noEmoji(p.headline), summary: noEmoji(p.summary), keywords: JSON.parse(p.keywords || '[]').map(noEmoji),
    category: p.category || 'Gujarat', focus: p.focus, publishedAt: p.published_at, image: await loadImageDataUri(p.image_url),
    lang: p.lang, rajkot: RAJKOT_RE.test(`${p.title} ${p.headline}`), reporter: p.reporter || '',
    rates: normTpl(p.template) === 'mandi' ? ratesForPost(p) : null,
  };
}

export const postWithItem = (id: number) => db().prepare('SELECT p.*, i.image_url, i.publisher, i.published_at, i.title, i.link FROM posts p JOIN items i ON i.id=p.item_id WHERE p.id=?').get(id) as any;

export async function renderPost(postId: number): Promise<string> {
  const p = postWithItem(postId);
  if (!p) throw new Error('post not found');
  const ws = getWorkspace(p.ws_id)!;
  const png = await renderFrame(normTpl(p.template), ws.settings, await frameDataForPost(p));
  const out = framePath(p.id, p.rev);
  fs.writeFileSync(out, png);
  db().prepare('UPDATE posts SET image_path=? WHERE id=?').run(out, p.id);
  return out;
}

export async function renderReelPng(postId: number, transparentBand = false) {
  const p = postWithItem(postId);
  const ws = getWorkspace(p.ws_id)!;
  return renderReelFrame(ws.settings, await frameDataForPost(p), transparentBand);
}

/** Brand caption: Gujarati headline (1-2 lines) + 3-4 hashtags incl. #atthistime #viralpost + topic tag. No emojis, no source. */
export function brandCaption(s: WorkspaceSettings, headline: string, tpl: string, it: any, score: number, extra?: string) {
  const fresh = Date.now() - it.published_at < 3 * 3600e3;
  const topic = tpl === 'mandi' || /(યાર્ડ|apmc|એપીએમસી|મંડી)/i.test(headline) ? '#APMC' : fresh && score >= 8 ? '#BreakingNews' : '#NewsUpdate';
  const tags = ['#atthistime', '#viralpost', topic];
  if (tpl === 'mandi') tags.push('#apmc_rate');
  else if (/rajkot|રાજકોટ/i.test(it.title)) tags.push('#Rajkot');
  else if (s.cityTag) tags.push(s.cityTag);
  return `${noEmoji(headline)}${extra ? `\n${noEmoji(extra)}` : ''}\n\n${tags.join(' ')}`;
}

export async function createPostForItem(wsId: number, itemId: number, langOverride?: 'en' | 'gu') {
  const d = db();
  const ws = getWorkspace(wsId)!;
  const it = d.prepare('SELECT * FROM items WHERE id=?').get(itemId) as any;
  if (!it) throw new Error('item not found');
  // Enrich: og:image + og:description from the publisher page when the feed lacks them
  if (it.link.includes('news.google.com')) {
    let real = await resolveGoogleNews(it.link);
    if (!real) { await new Promise((r) => setTimeout(r, 2500)); real = await resolveGoogleNews(it.link); }
    if (real) { it.link = real; d.prepare('UPDATE items SET link=? WHERE id=?').run(real, it.id); }
  }
  if (!it.image_url || !it.description) {
    const e = await enrichFromPage(it.link);
    if (e.image && !it.image_url) it.image_url = e.image;
    if (e.description && !it.description) it.description = e.description;
    d.prepare('UPDATE items SET image_url=?, description=? WHERE id=?').run(it.image_url || '', it.description || '', it.id);
  }
  const lang = langOverride || ws.settings.language;
  const s = await summarize(it, lang, { provider: ws.settings.aiProvider, geminiModel: ws.settings.geminiModel, claudeModel: ws.settings.model }, wsId);
  const now = Date.now();
  const hasImage = !!(await loadImageDataUri(it.image_url));
  const tpl = pickTemplate({ ...it, title: `${it.title} ${s.headline}` }, s, hasImage, ws.settings.template);
  if (s.rates && s.rates.length >= 2) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(it.published_at));
    d.prepare('DELETE FROM mandi_rates WHERE item_id=?').run(it.id);
    const ins = d.prepare('INSERT INTO mandi_rates (ws_id, yard, date, commodity, min_price, max_price, unit, item_id, sample, created_at) VALUES (?,?,?,?,?,?,?,?,0,?)');
    for (const r of s.rates.slice(0, 16)) ins.run(wsId, s.yard || ws.settings.location, day, r.commodity, r.min, r.max, '20 કિલો', it.id, now);
    log(wsId, 'success', `Extracted ${s.rates.length} APMC rates (${s.yard || ws.settings.location}) from "${it.title.slice(0, 50)}"`);
  }
  const flags = JSON.stringify({ person: !!s.person, yard: s.yard || '' });
  const status = ws.settings.autoApproveScore > 0 && s.score >= ws.settings.autoApproveScore ? 'approved' : 'pending';
  const existing = d.prepare('SELECT id, rev FROM posts WHERE item_id=?').get(itemId) as any;
  let postId: number;
  const caption = brandCaption(ws.settings, s.headline, tpl, it, s.score, tpl === 'mandi' ? `${s.yard || ws.settings.location} બજાર ભાવ` : '');
  if (existing) {
    d.prepare(`UPDATE posts SET headline=?, summary=?, caption=?, keywords=?, hashtags=?, category=?, focus=?, score=?, lang=?, summarizer=?, model=?, template=?, flags=?, rev=rev+1, updated_at=? WHERE id=?`)
      .run(s.headline, s.summary, caption, JSON.stringify(s.keywords), JSON.stringify(s.hashtags), s.category, it.focus, s.score, lang, s.summarizer, s.model || null, tpl, flags, now, existing.id);
    postId = existing.id;
  } else {
    const r = d.prepare(`INSERT INTO posts (ws_id, item_id, headline, summary, caption, keywords, hashtags, category, focus, score, lang, template, status, summarizer, model, created_at, updated_at, flags, reporter)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(wsId, itemId, s.headline, s.summary, caption, JSON.stringify(s.keywords), JSON.stringify(s.hashtags), s.category, it.focus, s.score, lang, tpl, status, s.summarizer, s.model || null, now, now, flags, ws.settings.reporterDefault || '');
    postId = Number(r.lastInsertRowid);
  }
  d.prepare('UPDATE items SET processed=1 WHERE id=?').run(itemId);
  await renderPost(postId);
  return { postId, summarizer: s.summarizer };
}

export async function runPipeline(wsId: number, trigger: 'schedule' | 'manual' | 'cron' | 'boot') {
  if (g.__gnsRunning.has(wsId)) return { skipped: true, reason: 'already running' };
  g.__gnsRunning.add(wsId);
  const d = db();
  const ws = getWorkspace(wsId);
  const run = d.prepare('INSERT INTO runs (ws_id, trigger, started_at, status) VALUES (?,?,?,?)').run(wsId, trigger, Date.now(), 'running');
  const runId = Number(run.lastInsertRowid);
  log(wsId, 'info', `Pipeline started (${trigger}) for "${ws?.name}"`);
  try {
    const f = await fetchSources(wsId);
    // Only new items; agriculture first, industry second, Rajkot boost, then newest.
    const limit = Math.max(1, Math.min(30, ws!.settings.maxPerRun || 10));
    // Quota keeps the mix: ~50% agriculture, ~30% industry, rest Rajkot/general; unused slots roll over by priority.
    const pick = (focusSql: string, n: number, exclude: number[]) => n <= 0 ? [] : d.prepare(`SELECT id, title FROM items WHERE ws_id=? AND processed=0 AND published_at > ? ${focusSql}
      ${exclude.length ? `AND id NOT IN (${exclude.join(',')})` : ''}
      ORDER BY (priority + CASE WHEN published_at > ? THEN 2 ELSE 0 END) DESC, published_at DESC LIMIT ?`)
      .all(wsId, Date.now() - 48 * 3600e3, Date.now() - 6 * 3600e3, n) as any[];
    const picks: any[] = [];
    const ids = () => picks.map((p) => p.id);
    picks.push(...pick("AND focus='agri'", Math.ceil(limit * 0.5), ids()));
    picks.push(...pick("AND focus='industry'", Math.round(limit * 0.3), ids()));
    picks.push(...pick("AND focus NOT IN ('agri','industry')", limit - picks.length, ids()));
    picks.push(...pick('', limit - picks.length, ids()));
    // Near-duplicate guard: the same story often arrives from several outlets.
    const seen: Set<string>[] = (d.prepare('SELECT i.title, p.headline FROM posts p JOIN items i ON i.id=p.item_id WHERE p.ws_id=? AND p.created_at > ?')
      .all(wsId, Date.now() - 48 * 3600e3) as any[]).flatMap((r) => [stems(r.title), stems(r.headline)]);
    const unique: any[] = [];
    for (const p of picks) {
      const st = stems(p.title);
      if (seen.some((x) => similar(st, x))) { d.prepare('UPDATE items SET processed=3 WHERE id=?').run(p.id); continue; }
      seen.push(st); unique.push(p);
    }
    picks.length = 0; picks.push(...unique);
    let made = 0;
    for (const p of picks) {
      try {
        await createPostForItem(wsId, p.id);
        made++;
      } catch (e: any) {
        d.prepare('UPDATE items SET processed=2 WHERE id=?').run(p.id);
        log(wsId, 'error', `Failed to build post for "${p.title.slice(0, 60)}": ${e.message}`);
      }
    }
    // Gradually upgrade older fallback (extractive) posts with the AI provider: small batch per run
    let upgraded = 0;
    if (aiStatus({ provider: ws!.settings.aiProvider }).active !== 'extractive') {
      const old = d.prepare("SELECT id, item_id, lang FROM posts WHERE ws_id=? AND summarizer='extractive' AND status != 'rejected' ORDER BY CASE focus WHEN 'agri' THEN 0 WHEN 'industry' THEN 1 ELSE 2 END, created_at DESC LIMIT ?")
        .all(wsId, Number(process.env.AI_BACKFILL_PER_RUN || 3)) as any[];
      for (const o of old) {
        try {
          const r = await createPostForItem(wsId, o.item_id, o.lang === 'en' ? 'en' : 'gu');
          if (r.summarizer === 'extractive') break; // provider went down / rate-limited; try next run
          upgraded++;
        } catch (e: any) { log(wsId, 'warn', `AI upgrade of post #${o.id} failed: ${e.message}`); break; }
      }
      if (upgraded) log(wsId, 'info', `Upgraded ${upgraded} older fallback post(s) with AI summaries`);
    }
    // Backfill: retry publisher-link + image lookup for a few earlier posts that still point at Google News
    const stale = d.prepare("SELECT p.id, p.item_id FROM posts p JOIN items i ON i.id=p.item_id WHERE p.ws_id=? AND i.link LIKE '%news.google.com%' AND (i.image_url IS NULL OR i.image_url='') ORDER BY p.id DESC LIMIT 4").all(wsId) as any[];
    for (const st of stale) {
      const it = d.prepare('SELECT * FROM items WHERE id=?').get(st.item_id) as any;
      const real = await resolveGoogleNews(it.link);
      if (!real) continue;
      const e = await enrichFromPage(real);
      d.prepare('UPDATE items SET link=?, image_url=COALESCE(NULLIF(image_url,\'\'), ?), description=COALESCE(NULLIF(description,\'\'), ?) WHERE id=?').run(real, e.image || '', e.description || '', it.id);
      if (e.image) { d.prepare('UPDATE posts SET rev=rev+1 WHERE id=?').run(st.id); await renderPost(st.id); }
    }
    d.prepare('UPDATE runs SET finished_at=?, fetched=?, new_items=?, posts=?, status=? WHERE id=?').run(Date.now(), f.fetched, f.added, made, 'ok', runId);
    log(wsId, 'success', `Pipeline finished: ${f.added} new stories, ${made} posts summarised + framed`);
    return { fetched: f.fetched, added: f.added, posts: made };
  } catch (e: any) {
    d.prepare('UPDATE runs SET finished_at=?, status=?, error=? WHERE id=?').run(Date.now(), 'error', e.message, runId);
    log(wsId, 'error', `Pipeline error: ${e.message}`);
    return { error: e.message };
  } finally {
    g.__gnsRunning.delete(wsId);
  }
}

export const isRunning = (wsId: number) => g.__gnsRunning.has(wsId);

/** One-time migration: strip source names from posts made before the "no source in Instagram output" rule and re-render frames. */
export async function scrubExistingPosts() {
  if (kvGet('scrub_sources_v1')) return;
  const d = db();
  const rows = d.prepare('SELECT p.*, i.publisher FROM posts p JOIN items i ON i.id=p.item_id').all() as any[];
  for (const p of rows) {
    const tags = JSON.parse(p.hashtags || '[]');
    const capBody = String(p.caption || '').replace(/\n\n#[\s\S]*$/, '');
    const sm = scrubSource({ headline: p.headline, summary: p.summary, caption: capBody, keywords: JSON.parse(p.keywords || '[]'), hashtags: tags, category: p.category, score: p.score, summarizer: p.summarizer }, p.publisher);
    if (p.summarizer === 'extractive' && !sm.summary) sm.summary = sm.headline;
    d.prepare('UPDATE posts SET headline=?, summary=?, caption=?, keywords=?, hashtags=?, rev=rev+1 WHERE id=?')
      .run(sm.headline, sm.summary, `${sm.caption}\n\n${sm.hashtags.join(' ')}`, JSON.stringify(sm.keywords), JSON.stringify(sm.hashtags), p.id);
    try { await renderPost(p.id); } catch (e: any) { console.error('re-render failed', p.id, e.message); }
  }
  kvSet('scrub_sources_v1', String(Date.now()));
  if (rows.length) log(null, 'info', `Removed source names from ${rows.length} existing posts and re-rendered their frames`);
}

/** Crude stemmer for EN + Gujarati titles: first 4 chars of each meaningful token. */
export function stems(t: string): Set<string> {
  return new Set(String(t || '').toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').split(/\s+/)
    .filter((w) => w.length >= 3 && !/^(યાર્ડ|આવક|માર્કેટ|જિલ્લા|ભાવ)/.test(w) && !/^(the|and|for|with|from|after|over|news|gujarat|ગુજરાત|માટે|અને)$/.test(w)).map((w) => [...w].slice(0, 4).join('')));
}
export function similar(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return false;
  let n = 0; for (const x of a) if (b.has(x)) n++;
  return n >= 3 && n / Math.min(a.size, b.size) >= 0.5;
}
