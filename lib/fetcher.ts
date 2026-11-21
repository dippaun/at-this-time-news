import { XMLParser } from 'fast-xml-parser';
import crypto from 'crypto';
import { db, log } from './db';
import { classify } from './classify';
import type { Focus } from './sources';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 GujaratNewsStudio/0.1';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text', cdataPropName: false as any, processEntities: true, htmlEntities: true });

export const sha = (s: string) => crypto.createHash('sha1').update(s).digest('hex');
const txt = (v: any): string => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return txt(v[0]);
  return String(v['#text'] ?? '');
};
export const stripHtml = (s: string) =>
  (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
export const normTitle = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').slice(0, 10).join(' ');

export async function fetchWithTimeout(url: string, ms = 12000, init: RequestInit = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal, headers: { 'user-agent': UA, accept: '*/*', ...(init.headers || {}) }, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
}

function pickImage(it: any): string {
  const cands: any[] = [];
  const push = (x: any) => { if (!x) return; (Array.isArray(x) ? x : [x]).forEach((y) => cands.push(y)); };
  push(it['media:content']); push(it['media:thumbnail']); push(it.enclosure); push(it['media:group']?.['media:content']);
  for (const c of cands) {
    const u = c?.['@url'] || c?.['@href'];
    const type = c?.['@type'] || c?.['@medium'] || '';
    if (u && (!type || /image/.test(type))) return u;
  }
  const html = txt(it['content:encoded']) + ' ' + txt(it.description);
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

type Parsed = { title: string; link: string; description: string; publisher: string; image: string; published: number };

function parseFeed(xml: string): Parsed[] {
  const j = parser.parse(xml);
  let items: any[] = j?.rss?.channel?.item || j?.feed?.entry || j?.['rdf:RDF']?.item || [];
  if (!Array.isArray(items)) items = [items];
  return items.map((it) => {
    let title = stripHtml(txt(it.title));
    let link = txt(it.link) || it.link?.['@href'] || (Array.isArray(it.link) ? it.link[0]?.['@href'] : '') || txt(it.guid);
    let publisher = txt(it.source) || '';
    if (publisher && title.endsWith(` - ${publisher}`)) title = title.slice(0, -(publisher.length + 3)).trim();
    let description = stripHtml(txt(it.description) || txt(it.summary) || txt(it['content:encoded']));
    // Google News descriptions repeat the title + publisher; drop them
    if (link.includes('news.google.com')) description = '';
    const pub = Date.parse(txt(it.pubDate) || txt(it.published) || txt(it.updated) || txt(it['dc:date'])) || Date.now();
    return { title, link: String(link).trim(), description: description.slice(0, 1200), publisher, image: pickImage(it), published: pub };
  }).filter((x) => x.title && x.link);
}

export async function fetchSources(wsId: number) {
  const d = db();
  const sources = d.prepare('SELECT * FROM sources WHERE ws_id=? AND enabled=1').all(wsId) as any[];
  const insert = d.prepare(`INSERT OR IGNORE INTO items (ws_id, source_id, link_hash, title_hash, title, link, description, publisher, image_url, lang, published_at, fetched_at, category, focus, priority)
    VALUES (@ws_id,@source_id,@link_hash,@title_hash,@title,@link,@description,@publisher,@image_url,@lang,@published_at,@fetched_at,@category,@focus,@priority)`);
  const titleSeen = d.prepare('SELECT 1 FROM items WHERE ws_id=? AND title_hash=? LIMIT 1');
  let fetched = 0, added = 0;
  const cutoff = Date.now() - 4 * 24 * 3600e3;

  const one = async (s: any) => {
    const r = await fetchWithTimeout(s.url, 15000);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { s, list: parseFeed(await r.text()) };
  };
  // Publisher feeds in parallel; Google News feeds one at a time (it rate-limits bursts with HTTP 429).
  const results: PromiseSettledResult<{ s: any; list: Parsed[] }>[] = new Array(sources.length);
  const isG = (s: any) => s.url.includes('news.google.com');
  const parallel = Promise.all(sources.map(async (s, i) => { if (!isG(s)) results[i] = await one(s).then((value) => ({ status: 'fulfilled', value }) as const, (reason) => ({ status: 'rejected', reason }) as const); }));
  for (let i = 0; i < sources.length; i++) {
    if (!isG(sources[i])) continue;
    results[i] = await one(sources[i]).then((value) => ({ status: 'fulfilled', value }) as const, (reason) => ({ status: 'rejected', reason }) as const);
    await new Promise((r) => setTimeout(r, 700));
  }
  await parallel;

  results.forEach((res, i) => {
    const s = sources[i];
    if (res.status === 'rejected') {
      d.prepare('UPDATE sources SET last_status=?, last_fetched_at=? WHERE id=?').run(`error: ${res.reason?.message || res.reason}`, Date.now(), s.id);
      log(wsId, 'warn', `Source failed: ${s.name} (${res.reason?.message || res.reason})`);
      return;
    }
    const list = res.value.list.filter((x) => x.published > cutoff).slice(0, 40);
    fetched += list.length;
    let n = 0;
    const tx = d.transaction(() => {
      for (const x of list) {
        const th = sha(normTitle(x.title));
        if (titleSeen.get(wsId, th)) continue; // dedupe same story across feeds
        const c = classify(x.title, x.description, s.focus as Focus);
        const info = insert.run({
          ws_id: wsId, source_id: s.id, link_hash: sha(x.link), title_hash: th, title: x.title, link: x.link,
          description: x.description, publisher: x.publisher || s.name.split('·')[0].trim(), image_url: x.image, lang: /[\u0A80-\u0AFF]/.test(x.title) ? 'gu' : 'en',
          published_at: x.published, fetched_at: Date.now(), category: c.category, focus: c.focus, priority: c.priority,
        });
        if (info.changes) n++;
      }
    });
    tx();
    added += n;
    d.prepare('UPDATE sources SET last_status=?, last_count=?, last_fetched_at=? WHERE id=?').run('ok', list.length, Date.now(), s.id);
  });
  log(wsId, 'info', `Fetched ${fetched} entries from ${sources.length} sources → ${added} new unique stories`);
  return { fetched, added, sources: sources.length };
}

/** Pull og:image / og:description from the article page (skips Google News redirect links). */
export async function enrichFromPage(link: string): Promise<{ image?: string; description?: string }> {
  if (!link || link.includes('news.google.com')) return {};
  try {
    const r = await fetchWithTimeout(link, 7000, { headers: { accept: 'text/html' } });
    if (!r.ok) return {};
    const html = (await r.text()).slice(0, 300000);
    const meta = (p: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1]
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${p}["']`, 'i'))?.[1];
    return { image: meta('og:image') || meta('twitter:image'), description: stripHtml(meta('og:description') || meta('description') || '') };
  } catch {
    return {};
  }
}

/** Resolve a news.google.com/rss/articles/… redirect link to the publisher URL (free, no key). */
export async function resolveGoogleNews(link: string): Promise<string | null> {
  try {
    if (!link.includes('news.google.com')) return link;
    const id = new URL(link).pathname.split('/').pop();
    if (!id) return null;
    const html = await (await fetchWithTimeout(`https://news.google.com/articles/${id}`, 8000)).text();
    const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!sg || !ts) return null;
    const inner = JSON.stringify(['garturlreq', [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(ts), sg]);
    const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner, null, 'generic']]]));
    const r = await fetchWithTimeout('https://news.google.com/_/DotsSplashUi/data/batchexecute', 8000, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' } });
    const t = await r.text();
    const arr = JSON.parse(t.split('\n\n')[1]);
    const url = JSON.parse(arr[0][2])[1];
    return typeof url === 'string' && url.startsWith('http') ? url : null;
  } catch {
    return null;
  }
}
