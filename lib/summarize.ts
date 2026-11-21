import { kvGet, kvSet, log } from './db';

export type Provider = 'gemini' | 'claude' | 'extractive';
export type Summary = {
  headline: string; summary: string; keywords: string[]; hashtags: string[]; category: string; score: number; caption: string;
  summarizer: Provider; model?: string;
  person?: boolean; yard?: string; rates?: { commodity: string; min: number; max: number }[];
};
type In = { title: string; description: string; publisher: string; focus: string; category: string; priority: number; published_at: number; lang: string };
export type AiConfig = { provider: 'auto' | Provider; geminiModel: string; claudeModel: string };

const CATEGORIES = ['Agriculture', 'Industry', 'Weather', 'Politics', 'Crime', 'Business', 'Sports', 'Health', 'Education', 'Gujarat'];
export const GEMINI_DEFAULT = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
// Tried in order if the configured model is retired / overloaded
const GEMINI_FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
const GEMINI_MIN_GAP_MS = Number(process.env.GEMINI_MIN_GAP_MS || 7000); // ≈8 requests/minute, under free-tier RPM

const KEY: Record<'gemini' | 'claude', string | undefined> = {
  gemini: process.env.GEMINI_API_KEY,
  claude: process.env.ANTHROPIC_API_KEY,
};

function provStatus(p: 'gemini' | 'claude') {
  const until = Number(kvGet(`${p}_down_until`) || 0);
  return {
    configured: !!KEY[p],
    available: !!KEY[p] && Date.now() > until,
    lastError: kvGet(`${p}_last_error`) || '',
    lastOk: Number(kvGet(`${p}_last_ok`) || 0),
    retryAt: until,
  };
}

/** Which provider will be used next and the health of each. */
export function aiStatus(cfg?: Partial<AiConfig>) {
  const gemini = provStatus('gemini'), claude = provStatus('claude');
  const provider = cfg?.provider || (process.env.AI_PROVIDER as any) || 'auto';
  const order = chain(provider);
  const active = order.find((p) => p === 'extractive' || (p === 'gemini' ? gemini.available : claude.available)) || 'extractive';
  return { provider, active, gemini, claude, available: active !== 'extractive', lastError: gemini.lastError || claude.lastError, configured: gemini.configured || claude.configured };
}

function chain(provider: string): Provider[] {
  if (provider === 'gemini') return ['gemini', 'extractive'];
  if (provider === 'claude') return ['claude', 'extractive'];
  if (provider === 'extractive') return ['extractive'];
  return ['gemini', 'claude', 'extractive'];
}

function buildPrompt(it: In, lang: 'en' | 'gu') {
  const langLine = lang === 'gu'
    ? 'Write headline, summary and caption in Gujarati (ગુજરાતી script). Keywords should be in Gujarati; hashtags in English or Gujarati without spaces. Use ONLY Gujarati script (plus English/digits) — never Hindi, Telugu or any other Indian script.'
    : 'Write everything in clear English (translate if the source is Gujarati).';
  return `You are the social-media news editor for a Gujarat news page whose PRIMARY audience is farmers and agri-traders (Rajkot, Gondal, Saurashtra APMC yards), with industry/business as the second focus.
Story:
Title: ${it.title}
Details: ${it.description || '(only the headline is available)'}

${langLine}
STRICT RULE: never mention the news source, publisher, newspaper, TV channel, website, URL, "via", "source" or "reported by" in ANY field (these posts are published under our own brand).
Return ONLY a JSON object with keys:
"headline": punchy headline, max 12 words,
"summary": 2-3 short factual sentences (max 55 words). Do not invent facts beyond the story,
"keywords": array of 5-8 keywords,
"hashtags": array of 5-8 hashtags each starting with #,
"category": one of ${CATEGORIES.join(', ')},
"score": integer 1-10 for how postworthy this is for the page (agriculture/mandi prices/weather-for-farmers highest, industry next, Rajkot/Saurashtra boost),
"caption": 1-2 line Gujarati caption that restates the headline (no emojis, no hashtags, no call to action),
"person": true if the story is mainly about one named person (appointment, award, achievement, obituary, profile), else false,
"yard": ONLY the short APMC / market-yard name in Gujarati (max 4 words, e.g. "ગોંડલ યાર્ડ") if the story is about a specific yard, otherwise exactly "" (empty string, no explanation),
"rates": ONLY if the story text explicitly lists commodity prices: array of {"commodity" (Gujarati name), "min" (number, price per 20 kg), "max" (number, price per 20 kg)}; otherwise []. Never guess numbers.`;
}

function toSummary(o: any, it: In, provider: Provider, model: string): Summary {
  const tags = (o.hashtags || []).map((h: string) => (String(h).startsWith('#') ? h : `#${h}`).replace(/\s+/g, '')).slice(0, 8);
  if (!o.headline || !o.summary) throw new Error('AI JSON missing headline/summary');
  return {
    headline: String(o.headline).trim(),
    summary: String(o.summary).trim(),
    keywords: (o.keywords || []).map(String).slice(0, 8),
    hashtags: tags,
    category: CATEGORIES.includes(o.category) ? o.category : it.category,
    score: Math.max(1, Math.min(10, Math.round(Number(o.score) || 5))),
    caption: String(o.caption || '').trim(),
    person: !!o.person,
    yard: cleanYard(o.yard),
    rates: Array.isArray(o.rates) ? o.rates.filter((r: any) => r && r.commodity && Number(r.max) > 0).map((r: any) => ({ commodity: String(r.commodity), min: Number(r.min) || 0, max: Number(r.max) })) : [],
    summarizer: provider,
    model,
  };
}
const parseJson = (text: string) => { const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error('No JSON in AI response'); return JSON.parse(m[0]); };

class AiError extends Error { constructor(msg: string, public status: number, public retryAfterMs = 0) { super(msg); } }

// ---- Gemini (free tier) with a global throttle ----
const g = globalThis as any;
async function throttleGemini() {
  const wait = (g.__gnsGeminiLast || 0) + GEMINI_MIN_GAP_MS - Date.now();
  g.__gnsGeminiLast = Date.now() + Math.max(0, wait);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

async function geminiCall(model: string, prompt: string) {
  await throttleGemini();
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY.gemini as string, 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: {
      responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 1200,
      responseSchema: {
        type: 'OBJECT', required: ['headline', 'summary', 'keywords', 'hashtags', 'category', 'score', 'caption'],
        properties: {
          headline: { type: 'STRING' }, summary: { type: 'STRING' }, caption: { type: 'STRING' }, category: { type: 'STRING' },
          keywords: { type: 'ARRAY', items: { type: 'STRING' } }, hashtags: { type: 'ARRAY', items: { type: 'STRING' } }, score: { type: 'INTEGER' },
          person: { type: 'BOOLEAN' }, yard: { type: 'STRING' },
          rates: { type: 'ARRAY', items: { type: 'OBJECT', properties: { commodity: { type: 'STRING' }, min: { type: 'NUMBER' }, max: { type: 'NUMBER' } } } },
        },
      },
    } }),
    signal: AbortSignal.timeout(45000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    const delay = j?.error?.details?.find((d: any) => d.retryDelay)?.retryDelay;
    throw new AiError(j?.error?.message || `HTTP ${r.status}`, r.status, delay ? parseFloat(delay) * 1000 : 0);
  }
  const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
  return parseJson(text);
}

async function gemini(it: In, lang: 'en' | 'gu', model: string): Promise<Summary> {
  const prompt = buildPrompt(it, lang);
  const models = [model, ...GEMINI_FALLBACKS.filter((m) => m !== model)];
  let last: any;
  for (const m of [models[0], ...models.slice(0, 3)]) { // first model gets one retry
    try {
      const out = toSummary(await geminiCall(m, prompt), it, 'gemini', m);
      // Guard against stray words in other Indic scripts (seen occasionally in Gujarati output)
      if (lang === 'gu' && /[\u0900-\u0A7F\u0B00-\u0DFF]/.test(`${out.headline} ${out.summary} ${out.caption}`)) throw new Error('Mixed-script Gujarati output');
      return out;
    } catch (e: any) {
      last = e;
      // Retired/unknown model or temporary overload -> try the next model; quota (429) -> stop and back off
      // Malformed JSON (no HTTP status) -> retry with the next model too
      if (!(e.status === 404 || e.status === 503 || !e.status || /no longer available|not found|high demand/i.test(e.message))) break;
    }
  }
  throw last;
}

// ---- Claude (optional) ----
async function claude(it: In, lang: 'en' | 'gu', model: string): Promise<Summary> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY.claude as string, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 700, temperature: 0.3, messages: [{ role: 'user', content: buildPrompt(it, lang) }] }),
    signal: AbortSignal.timeout(30000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new AiError(j?.error?.message || `HTTP ${r.status}`, r.status);
  return toSummary(parseJson(j.content?.map((c: any) => c.text || '').join('') || ''), it, 'claude', model);
}

const STOP = new Set(('a an the of in on at to for from by with and or is are was were be been has have had will would can could this that these those it its as into over after before about after near amid says said new news latest live today update updates gujarat\'s than more most also up out not no yes his her their our your we you they he she them who what when where why how per via - — | : ; , . ! ? ’s s ' +
  'છે અને માં ના ની નું નો ને થી પર એ આ તે કે શું હતી હતો હતું છતાં માટે સાથે પણ જ તો રહ્યા રહી રહ્યો બાદ દ્વારા કર્યું કરી કર્યો કરવા થયો થઈ થયા સુધી હવે વધુ').split(/\s+/));

function extractive(it: In, lang: 'en' | 'gu'): Summary {
  const clean = it.title.replace(/\s+[-|–]\s+[^-|–]+$/, '').trim();
  // Gujarati portals often write "Headline: sub-headline" — split it for a tighter frame
  const parts = clean.split(/:\s*/);
  const split = parts.length >= 2 && parts[0].length >= 15 && parts.slice(1).join(': ').length >= 15;
  const head = split ? parts[0] : clean;
  const headline = head.length > 95 ? head.slice(0, 92).replace(/\s+\S*$/, '') + '…' : head;
  const gu = (x: string) => /[\u0A80-\u0AFF]/.test(x);
  const desc = it.description && gu(it.description) === gu(clean) ? it.description : '';
  const sentences = desc.split(/(?<=[.!?।])\s+/).map((s) => s.trim())
    .filter((s) => s.length > 25 && !clean.startsWith(s.slice(0, 30)) && !/follow|read more|click here|subscribe|appeared first|ફોલો કરો/i.test(s));
  let summary = [split ? parts.slice(1).join(': ') + '.' : '', ...sentences].filter(Boolean).slice(0, 3).join(' ');
  if (summary.length > 320) summary = summary.slice(0, 317).replace(/\s+\S*$/, '') + '…';
  if (!summary) summary = split ? parts.slice(1).join(': ') : clean;

  const words = `${clean} ${it.description || ''}`.replace(/[“”"'‘’(),.:;!?|–—\-\[\]]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w));
  const freq = new Map<string, number>();
  words.forEach((w, i) => freq.set(w, (freq.get(w) || 0) + 1 + (i < 12 ? 1 : 0) + (/^[A-Z\u0A80-\u0AFF]/.test(w) ? 0.5 : 0)));
  const kw = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).filter((w, i, a) => a.findIndex((x) => x.toLowerCase() === w.toLowerCase()) === i);
  const base = it.focus === 'agri' ? ['Agriculture', 'Farmers'] : it.focus === 'industry' ? ['Industry', 'Business'] : [];
  const keywords = [...new Set([...kw.slice(0, 6), ...base, 'Gujarat'])].slice(0, 8);
  const tag = (w: string) => '#' + w.replace(/[^\p{L}\p{N}\p{M}]/gu, '');
  const hashtags = [...new Set(['#Gujarat', ...(it.focus === 'agri' ? ['#GujaratFarmers', '#APMC', '#Kheti'] : it.focus === 'industry' ? ['#GujaratIndustry', '#MakeInGujarat'] : []),
    ...(/rajkot|રાજકોટ/i.test(it.title) ? ['#Rajkot'] : []), ...keywords.slice(0, 4).map(tag), '#GujaratNews'])].slice(0, 8);
  const ageH = (Date.now() - it.published_at) / 3600e3;
  const score = Math.max(1, Math.min(10, Math.round(3 + it.priority * 0.45 + (ageH < 3 ? 1 : ageH > 24 ? -1 : 0))));
  const caption = lang === 'gu'
    ? `${headline}\n\n${summary}\n\nવધુ ગુજરાત સમાચાર માટે ફોલો કરો 🔔`
    : `${headline}\n\n${summary}\n\nFollow for live Gujarat agri & industry updates 🔔`;
  const person = /(નિમણૂક|નિયુક્ત|સન્માન|એવોર્ડ|શ્રદ્ધાંજલિ|અવસાન|બેસણું|જન્મદિવસ|appointed|award|honou?red|passes away|obituary|felicitat)/i.test(clean);
  return { headline, summary, keywords, hashtags, category: it.category, score, caption: headline, summarizer: 'extractive', person, yard: '', rates: [] };
}

// Publisher names that must never appear in Instagram output (frames, reels, captions, hashtags)
const KNOWN_SOURCES = ['Divya Bhaskar', 'DivyaBhaskar', 'Bhaskar English', 'Bhaskar', 'Sandesh', 'Gujarat Samachar', 'GujaratSamachar', 'Times of India', 'TOI', 'DeshGujarat', 'Desh Gujarat', 'Indian Express', 'TV9 Gujarati', 'TV9', 'GSTV', 'BBC Gujarati', 'BBC', 'ABP Asmita', 'News18', 'Zee 24 Kalak', 'VTV', 'Gujarat First', 'Google News', 'Google સમાચાર', 'દિવ્ય ભાસ્કર', 'ગુજરાત સમાચાર', 'DD News', 'ANI', 'PTI', 'Rakhewal Daily', 'AajkaalDaily', 'Connect Gujarat', 'Western Times', 'Ahmedabad Mirror', 'NDTV'];
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function scrubSource(sm: Summary, publisher: string): Summary {
  const names = [...new Set([(publisher || '').replace(/[\s\-–|]+$/, ''), ...KNOWN_SOURCES].filter((n) => n && n.trim().length > 1))].sort((a, b) => b.length - a.length);
  const alt = names.map(esc).join('|');
  const clean = (t: string) => (t || '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(new RegExp(`[(\\[]?\\s*(via|source|reported by|courtesy|સ્રોત|સૌજન્ય)\\s*[:\\-]?\\s*(${alt})\\s*[)\\]]?\\.?`, 'gi'), '')
    .replace(new RegExp(`(?<![\\p{L}\\p{M}])(${alt})(?![\\p{L}\\p{M}])`, 'giu'), '')
    .replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/\(\s*\)|\[\s*\]/g, '').replace(/[ \t]*[-–|:][ \t]*$/gm, '').trim();
  const flat = names.map((n) => n.replace(/\s+/g, '').toLowerCase());
  const isSource = (t: string) => flat.some((n) => t.replace(/[#\s]/g, '').toLowerCase().includes(n));
  return {
    ...sm,
    headline: clean(sm.headline), summary: clean(sm.summary), caption: clean(sm.caption),
    keywords: sm.keywords.filter((k) => !isSource(k)).map(clean).filter(Boolean),
    hashtags: sm.hashtags.filter((h) => !isSource(h)),
  };
}

/** Provider chain: Gemini (free tier) -> Claude (if it has credit) -> extractive. Never throws. */
export async function summarize(it: In, lang: 'en' | 'gu', cfg: AiConfig, wsId: number): Promise<Summary> {
  for (const p of chain(cfg.provider)) {
    if (p === 'extractive') break;
    if (!provStatus(p).available) continue;
    try {
      const s = p === 'gemini' ? await gemini(it, lang, cfg.geminiModel || GEMINI_DEFAULT) : await claude(it, lang, cfg.claudeModel);
      kvSet(`${p}_last_ok`, String(Date.now()));
      kvSet(`${p}_last_error`, '');
      return scrubSource(s, it.publisher);
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 200);
      kvSet(`${p}_last_error`, msg);
      // Back off: 429 -> server retryDelay (min 60s); auth/billing/model errors -> 15 min
      const ms = e?.status === 429 ? Math.max(60e3, e.retryAfterMs || 0) : [400, 401, 403, 404].includes(e?.status) ? 15 * 60e3 : e?.status === 503 ? 60e3 : 0;
      if (ms) kvSet(`${p}_down_until`, String(Date.now() + ms));
      log(wsId, 'warn', `${p === 'gemini' ? 'Gemini' : 'Claude'} unavailable (${msg})${ms ? ` → backing off ${Math.round(ms / 60e3)} min` : ''}`);
    }
  }
  return scrubSource(extractive(it, lang), it.publisher);
}

/** Keep only short, real yard names; drop model explanations. */
export function cleanYard(v: unknown): string {
  let y = String(v || '').trim().split(/[,(\-–—.]/)[0].trim();
  if (!y || y.length > 32 || y.split(/\s+/).length > 4) return '';
  if (/(નથી|ખાલી|લાગુ|empty|none|n\/a)/i.test(y)) return '';
  if (!/(યાર્ડ|apmc|એપીએમસી|yard|મંડી)/i.test(y)) return '';
  y = y.replace(/(યાર્ડ)\S+/, '$1').replace(/યાર્ડુ$/, 'યાર્ડ');
  return y;
}
