// Crawl the running app (built with NEXT_PUBLIC_STATIC=1 + basePath) and write a static site for GitHub Pages.
// Usage: node scripts/export-static.mjs  (env: APP=http://127.0.0.1:3000, BASE=/at-this-time-news, OUT=out, DATA_DIR=data)
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const APP = process.env.APP || 'http://127.0.0.1:3000';
const BASE = process.env.BASE || '/at-this-time-news';
const OUT = path.resolve(process.env.OUT || 'out');
const DATA = path.resolve(process.env.DATA_DIR || 'data');
const MAX_PAGES = Number(process.env.MAX_PAGES || 260);
const FRAME_CACHE = path.join(DATA, 'static-frames');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FRAME_CACHE, { recursive: true });
const keepFrames = new Set();

const write = (rel, buf) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); };
async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(APP + url, { signal: AbortSignal.timeout(120000) }); return r; } catch (e) { if (i === tries - 1) throw e; await new Promise((r) => setTimeout(r, 2000)); }
  }
}
const toJpg = (png, out) => { const tmp = out + '.png'; fs.writeFileSync(tmp, png); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-q:v', '2', out]); fs.rmSync(tmp); };

const pages = new Set(), queue = [], assets = new Set();
const enqueue = (p) => { if (!pages.has(p) && pages.size < MAX_PAGES) { pages.add(p); queue.push(p); } };
['/', '/section/agri/', '/section/industry/', '/section/rajkot/', '/section/general/'].forEach(enqueue);

const LINK_RE = new RegExp(`${BASE.replace(/\//g, '\\/')}(\\/[^"'\\\\\\s)<>#?]*)`, 'g');
let n404 = 0;
while (queue.length) {
  const p = queue.shift();
  const r = await get(BASE + p);
  if (!r.ok) { console.warn('page', p, r.status); n404++; continue; }
  const html = await r.text();
  write(path.join(p, 'index.html'), html);
  for (const m of html.matchAll(LINK_RE)) {
    const u = m[1];
    if (u.startsWith('/_next/') || u.startsWith('/api/')) continue;
    if (/^\/(media|frames)\/|^\/epaper\.jpg$/.test(u)) { assets.add(u); continue; }
    if (/\.[a-z0-9]{2,5}$/i.test(u)) continue; // other files (copied from public/)
    if (/^\/(story\/\d+|section\/[a-z]+|city\/[a-z]+)?\/?$/.test(u)) enqueue(u.endsWith('/') ? u : u + '/');
  }
}
console.log(`pages: ${pages.size} (${n404} failed)`);

let ok = 0, miss = 0;
for (const u of assets) {
  try {
    if (u.startsWith('/media/')) {
      const f = path.join(DATA, 'media', path.basename(u));
      if (fs.existsSync(f)) { write(u, fs.readFileSync(f)); ok++; } else miss++;
    } else if (u.startsWith('/frames/')) {
      const m = u.match(/\/frames\/(\d+)-(\d+)-[a-z0-9]+(-reel)?\.jpg$/);
      if (!m) continue;
      const cached = path.join(FRAME_CACHE, path.basename(u));
      keepFrames.add(path.basename(u));
      if (!fs.existsSync(cached)) {
        const r = await get(`${BASE}/api/frame/${m[1]}${m[3] ? '?format=reel' : `?v=${m[2]}`}`);
        if (!r.ok) { miss++; continue; }
        toJpg(Buffer.from(await r.arrayBuffer()), cached);
      }
      write(u, fs.readFileSync(cached)); ok++;
    } else if (u === '/epaper.jpg') {
      const r = await get(`${BASE}/api/epaper`);
      if (r.ok) { const tmp = path.join(OUT, 'epaper.jpg'); toJpg(Buffer.from(await r.arrayBuffer()), tmp); ok++; } else miss++;
    }
  } catch (e) { miss++; console.warn('asset', u, e.message); }
}
console.log(`assets: ${ok} written, ${miss} missing`);
// Only keep frame renders still in use (persisted between runs via the Actions cache)
for (const f of fs.readdirSync(FRAME_CACHE)) if (!keepFrames.has(f)) fs.rmSync(path.join(FRAME_CACHE, f));

// 404 page, Next static assets, public files (fonts are only needed server-side for Satori)
const nf = await get(`${BASE}/__not_found__/`);
write('404.html', await nf.text());
fs.cpSync('.next/static', path.join(OUT, '_next/static'), { recursive: true });
for (const f of fs.readdirSync('public')) if (f !== 'fonts') fs.cpSync(path.join('public', f), path.join(OUT, f), { recursive: true });
write('.nojekyll', '');
const stories = [...pages].filter((p) => p.startsWith('/story/')).length;
write('build.json', JSON.stringify({ builtAt: new Date().toISOString(), pages: pages.size, stories, assets: ok }));
if (miss > ok / 4 || stories < 3) { console.error('Too many missing assets or too few stories — not deploying'); process.exit(1); }
