/**
 * An image for every story.
 *   1. Publisher image (og:image / feed) cached locally.
 *   2. Gemini image generation (if the key has image quota).
 *   3. Pollinations.ai (free, keyless) — bottom watermark strip is cropped.
 *   4. Branded gradient (rendered by the UI / frames) as the very last resort.
 * Generated once per story, cached in data/media/gen-<itemId>.jpg, and items.image_url is pointed at /api/media/<file>.
 */
import fs from 'fs';
import path from 'path';
import { db, kvGet, kvSet, log } from './db';
import { MEDIA_DIR, LOCAL_PREFIX, ensureMedia, isLocal, writeJpeg } from './media';
import { fetchWithTimeout } from './fetcher';
import { throttleGemini, GEMINI_DEFAULT } from './summarize';

const g = globalThis as any;
const GEMINI_IMAGE_MODELS = (process.env.GEMINI_IMAGE_MODELS || 'gemini-2.5-flash-image,gemini-3.1-flash-image-preview').split(',').map((s) => s.trim()).filter(Boolean);
const STYLE = 'Realistic documentary news photograph, natural light, 35mm, sharp focus, true-to-life colours. No text, no letters, no signs, no logos, no watermark, no identifiable faces.';

const FALLBACK_SCENES: Record<string, string> = {
  agri: 'Wide shot of a farm field in Saurashtra, Gujarat with crops and a farmer seen from behind',
  industry: 'Interior of a busy factory floor in a Gujarat industrial estate with machines and workers seen from a distance',
  Weather: 'Dramatic monsoon clouds over a village road in Gujarat',
  Crime: 'Police vehicle with flashing lights parked on an Indian city street at dusk, no people',
  Politics: 'Government administrative building in Gujarat with flags, wide angle',
  Education: 'Empty classroom with wooden desks in an Indian school, daylight',
  Health: 'Corridor of an Indian government hospital, clean and bright, no people',
  Sports: 'Cricket ground in Gujarat at golden hour, players far in the distance',
  Business: 'Busy wholesale market street in Rajkot with shops and goods, people far away',
  Gujarat: 'Street scene in Rajkot city, Gujarat, everyday life, wide angle',
};
// Keyword → scene, so stories get a relevant picture even when the AI prompt writer is unavailable.
const KEYWORD_SCENES: [RegExp, string][] = [
  [/કપાસ|cotton/i, 'White cotton bolls ready for harvest in a cotton field in Saurashtra, Gujarat'],
  [/મગફળી|groundnut|peanut/i, 'Freshly harvested groundnut heaps on a farm in Saurashtra, Gujarat'],
  [/જીરું|જીરા|cumin|jeera/i, 'Heap of cumin seeds at an agricultural market yard in Gujarat'],
  [/ડુંગળી|onion/i, 'Red onions piled in jute sacks at an Indian agricultural market yard'],
  [/લસણ|garlic/i, 'Heaps of garlic bulbs at an Indian wholesale market'],
  [/બટાટા|બટેટા|potato/i, 'Freshly harvested potatoes in a field in Gujarat'],
  [/ઘઉં|wheat/i, 'Golden wheat field in Gujarat at sunrise'],
  [/તલ|sesame/i, 'Sesame crop drying on a farm in Gujarat'],
  [/યાર્ડ|apmc|એપીએમસી|મંડી|mandi|હરાજી/i, 'Sacks of farm produce stacked at a busy APMC market yard in Saurashtra, Gujarat, traders far in the distance'],
  [/વરસાદ|માવઠ|rain|monsoon|વાવાઝોડ|cyclone/i, 'Dark rain clouds and rain falling over farmland in Gujarat'],
  [/ઠંડી|cold wave|શિયાળ/i, 'Foggy winter morning over fields in a Gujarat village'],
  [/ખેડૂત|ખેતી|farmer|farm|પાક|crop|સિંચાઈ|irrigation/i, 'Farmer seen from behind walking through green crop fields in Gujarat'],
  [/પશુ|ગાય|cattle|dairy|દૂધ|milk|અમૂલ/i, 'Cows at a dairy farm in a Gujarat village'],
  [/ખાતર|fertili[sz]er|યુરિયા/i, 'Fertilizer sacks stacked in a rural warehouse in Gujarat'],
  [/અકસ્માત|accident|collision|ટક્કર/i, 'Damaged car on a highway shoulder in Gujarat with police cones, no people'],
  [/હત્યા|murder|પોલીસ|police|ધરપકડ|arrest|ચોરી|theft|crime|ગુનો/i, 'Police jeep with flashing lights on an Indian street at night, no people'],
  [/આગ|fire|blaze/i, 'Fire brigade truck spraying water at a burning building at night in an Indian city'],
  [/કોર્ટ|court|હાઇકોર્ટ|ચુકાદ|tribunal|itat/i, 'Exterior of an Indian court building with stone pillars, daylight'],
  [/ટેક્સ|tax|gst|આવકવેરા/i, 'Calculator, ledger books and documents on an office desk in India'],
  [/ફેક્ટરી|factory|ઉદ્યોગ|industry|plant|ઔદ્યોગિક|gidc|મોરબી|ceramic|સિરામિક/i, 'Busy factory floor with machines in a Gujarat industrial estate, workers far away'],
  [/બંદર|port|જહાજ|ship/i, 'Cargo containers and cranes at a port in Gujarat'],
  [/રેલ|railway|train|ટ્રેન/i, 'Indian passenger train at a railway station platform in Gujarat'],
  [/રોડ|road|હાઇવે|highway|બ્રિજ|bridge/i, 'Highway with traffic and a flyover in Gujarat'],
  [/શાળા|school|પરીક્ષા|exam|વિદ્યાર્થી|student|યુનિવર્સિટી|university/i, 'Indian students seen from behind in a classroom'],
  [/હોસ્પિટલ|hospital|આરોગ્ય|health|ડોક્ટર|doctor/i, 'Bright corridor of an Indian hospital'],
  [/મંદિર|temple|તહેવાર|festival|ઉત્સવ|ગરબા|garba/i, 'Decorated Hindu temple in Gujarat lit with lamps during a festival'],
  [/ક્રિકેટ|cricket|મેચ|match|sport/i, 'Cricket stadium in Gujarat under floodlights, players far away'],
  [/કોર્પોરેશન|મહાનગરપાલિકા|બેઠક|meeting|સરકાર|government|ભાજપ|કોંગ્રેસ|ચૂંટણી|election|ધારાસભ્ય/i, 'Empty government meeting hall with rows of chairs and a podium in Gujarat'],
  [/પાણી|water|ડેમ|dam/i, 'Reservoir dam with flowing water in Saurashtra, Gujarat'],
  [/સોનું|gold|ચાંદી|silver|બજાર|market|શેર|stock|ભાવ|price|મોંઘવારી|inflation/i, 'Busy wholesale market street in Rajkot with shops and goods, people far away'],
];
export const fallbackScene = (focus?: string, category?: string, text = '') =>
  KEYWORD_SCENES.find(([re]) => re.test(text))?.[1] || FALLBACK_SCENES[category || ''] || FALLBACK_SCENES[focus || ''] || FALLBACK_SCENES.Gujarat;

let lastPoll = 0;
async function gap(ms: number, key: 'poll') {
  const wait = lastPoll + ms - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  if (key === 'poll') lastPoll = Date.now();
}

async function geminiImage(prompt: string): Promise<Buffer | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || Date.now() < Number(kvGet('gemini_image_down_until') || 0)) return null;
  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      await throttleGemini();
      const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, 60000, {
        method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${prompt}. ${STYLE} Landscape 16:10.` }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
      });
      if (!r.ok) { kvSet('gemini_image_last_error', `${model}: HTTP ${r.status}`); continue; }
      const j: any = await r.json();
      const part = (j.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData?.data);
      if (part) { kvSet('gemini_image_last_ok', String(Date.now())); return Buffer.from(part.inlineData.data, 'base64'); }
    } catch (e: any) { kvSet('gemini_image_last_error', `${model}: ${String(e?.message || e).slice(0, 80)}`); }
  }
  // Free tier has no image quota (429): back off for 6h instead of hammering it.
  kvSet('gemini_image_down_until', String(Date.now() + 6 * 3600e3));
  return null;
}

async function pollinations(prompt: string, seed: number): Promise<Buffer | null> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(`${prompt}. ${STYLE}`.slice(0, 700))}?width=1280&height=880&nologo=true&seed=${seed}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    await gap(attempt ? 12000 : 5000, 'poll');
    try {
      const r = await fetchWithTimeout(url, 90000, { headers: { accept: 'image/*' } });
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.startsWith('image/')) {
        const b = Buffer.from(await r.arrayBuffer());
        if (b.length > 8000) return b;
      }
      kvSet('pollinations_last_error', `HTTP ${r.status}`);
    } catch (e: any) { kvSet('pollinations_last_error', String(e?.message || e).slice(0, 80)); }
  }
  return null;
}

/** Generate (once) an illustrative image for a story. Returns the local URL or null. */
export async function generateImage(itemId: number, prompt: string): Promise<{ url: string; via: string } | null> {
  const file = `gen-${itemId}.jpg`;
  const out = path.join(MEDIA_DIR, file);
  if (fs.existsSync(out) && fs.statSync(out).size > 2000) return { url: LOCAL_PREFIX + file, via: 'cache' };
  const gem = await geminiImage(prompt);
  if (gem && (await writeJpeg(gem, out))) return { url: LOCAL_PREFIX + file, via: 'gemini' };
  const pol = await pollinations(prompt, itemId);
  if (pol && (await writeJpeg(pol, out, 0.075))) return { url: LOCAL_PREFIX + file, via: 'pollinations' };
  return null;
}

/** Ensure the item has a verified local image (publisher first, else generated). Updates items.image_url. */
export async function ensureItemImage(it: { id: number; image_url?: string; ws_id?: number }, prompt: string): Promise<{ url: string; via: string } | null> {
  const d = db();
  if (isLocal(it.image_url) && (await ensureMedia(it.image_url!))) return { url: it.image_url!, via: 'local' };
  if (it.image_url && !/news\.google\./.test(it.image_url)) {
    const f = await ensureMedia(it.image_url);
    if (f) {
      const url = LOCAL_PREFIX + path.basename(f);
      d.prepare('UPDATE items SET image_orig=COALESCE(NULLIF(image_orig,\'\'), image_url), image_url=?, image_src=? WHERE id=?').run(url, 'publisher', it.id);
      it.image_url = url;
      return { url, via: 'publisher' };
    }
  }
  const gen = await generateImage(it.id, prompt);
  if (!gen) return null;
  d.prepare('UPDATE items SET image_orig=COALESCE(NULLIF(image_orig,\'\'), image_url), image_url=?, image_src=?, image_prompt=? WHERE id=?')
    .run(gen.url, gen.via === 'cache' ? (d.prepare('SELECT image_src FROM items WHERE id=?').get(it.id) as any)?.image_src || 'generated' : gen.via, prompt, it.id);
  it.image_url = gen.url;
  return gen;
}

/** One Gemini text call → English photo prompts for a batch of headlines (for portal items that have no post yet). */
async function batchPrompts(items: { id: number; title: string; focus: string; category: string }[]): Promise<Record<number, string>> {
  const key = process.env.GEMINI_API_KEY;
  const out: Record<number, string> = {};
  if (!key || !items.length || Date.now() < Number(kvGet('gemini_down_until') || 0)) return out;
  try {
    await throttleGemini();
    const list = items.map((x) => `${x.id}: ${x.title}`).join('\n');
    const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_DEFAULT)}:generateContent`, 30000, {
      method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `For each Gujarat news headline below (id: headline), write ONE English sentence (max 30 words) describing a realistic, news-appropriate photograph to illustrate it (scene, setting, objects, light) in Gujarat, India. No text, signs, logos or identifiable faces (people only from behind or far away). Return a JSON array of {"id": number, "prompt": string}.\n\n${list}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 2500 } }),
    });
    if (!r.ok) return out;
    const j: any = await r.json();
    const arr = JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || '[]');
    for (const x of Array.isArray(arr) ? arr : []) if (x && Number(x.id) && x.prompt) out[Number(x.id)] = String(x.prompt).slice(0, 300);
  } catch { /* fall back to category scenes */ }
  return out;
}

/** Backfill: posts first, then the stories the portal is most likely to show. Throttled + capped per call. */
export async function backfillImages(wsId: number, cap = Number(process.env.IMAGE_BACKFILL_PER_RUN || 20)) {
  if (g.__gnsImgBusy) return { skipped: true };
  g.__gnsImgBusy = true;
  const d = db();
  let done = 0, gen = 0, pub = 0, failed = 0;
  try {
    // Self-heal: if a cached/generated file was lost (fresh disk / cache miss), fall back to the original URL and redo it.
    for (const r of d.prepare(`SELECT id, image_url FROM items WHERE ws_id=? AND image_url LIKE '${LOCAL_PREFIX}%'`).all(wsId) as any[]) {
      if (!fs.existsSync(path.join(MEDIA_DIR, path.basename(r.image_url)))) d.prepare("UPDATE items SET image_url=COALESCE(NULLIF(image_orig,''), ''), image_fail=0 WHERE id=?").run(r.id);
    }
    const rows = d.prepare(`SELECT i.id, i.ws_id, i.title, i.focus, i.category, i.image_url, p.id post_id, p.flags, p.headline FROM items i LEFT JOIN posts p ON p.item_id=i.id AND p.status != 'rejected'
      WHERE i.ws_id=? AND i.processed != 3 AND (i.image_url IS NULL OR i.image_url NOT LIKE '${LOCAL_PREFIX}%') AND COALESCE(i.image_fail,0) < 2
      ORDER BY (p.id IS NOT NULL) DESC, (i.priority + CASE WHEN i.published_at > ? THEN 3 ELSE 0 END) DESC, i.published_at DESC LIMIT ?`).all(wsId, Date.now() - 12 * 3600e3, cap) as any[];
    if (!rows.length) return { done: 0 };
    const need = rows.filter((r) => !JSON.parse(r.flags || '{}').imagePrompt);
    const prompts = await batchPrompts(need.map((r) => ({ id: r.id, title: r.headline || r.title, focus: r.focus, category: r.category })));
    for (const r of rows) {
      const prompt = JSON.parse(r.flags || '{}').imagePrompt || prompts[r.id] || fallbackScene(r.focus, r.category, `${r.headline || ''} ${r.title}`);
      const res = await ensureItemImage(r, prompt);
      if (res) { done++; if (res.via === 'publisher') pub++; else gen++; if (r.post_id) d.prepare('UPDATE posts SET rev=rev+1, image_path=NULL WHERE id=?').run(r.post_id); }
      else { failed++; d.prepare('UPDATE items SET image_fail=COALESCE(image_fail,0)+1 WHERE id=?').run(r.id); }
    }
    if (done || failed) log(wsId, failed ? 'warn' : 'success', `Images: ${pub} publisher photos cached, ${gen} AI-generated${failed ? `, ${failed} failed (retry later)` : ''}`);
    return { done, gen, pub, failed };
  } finally {
    g.__gnsImgBusy = false;
  }
}
