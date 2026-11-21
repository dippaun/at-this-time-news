import { kvGet, kvSet, log } from './db';

export type Summary = {
  headline: string; summary: string; keywords: string[]; hashtags: string[]; category: string; score: number; caption: string;
  summarizer: 'claude' | 'extractive'; model?: string;
};
type In = { title: string; description: string; publisher: string; focus: string; category: string; priority: number; published_at: number; lang: string };

const CATEGORIES = ['Agriculture', 'Industry', 'Weather', 'Politics', 'Crime', 'Business', 'Sports', 'Health', 'Education', 'Gujarat'];

export function aiStatus() {
  const until = Number(kvGet('claude_down_until') || 0);
  return {
    configured: !!process.env.ANTHROPIC_API_KEY,
    available: !!process.env.ANTHROPIC_API_KEY && Date.now() > until,
    lastError: kvGet('claude_last_error') || '',
    lastOk: Number(kvGet('claude_last_ok') || 0),
    retryAt: until,
  };
}

async function claude(it: In, lang: 'en' | 'gu', model: string): Promise<Summary> {
  const langLine = lang === 'gu'
    ? 'Write headline, summary and caption in Gujarati (ગુજરાતી script). Keywords may be Gujarati or English; hashtags in English or Gujarati without spaces.'
    : 'Write everything in clear English (translate if the source is Gujarati).';
  const prompt = `You are the social-media news editor for a Gujarat news page whose PRIMARY audience is farmers and agri-traders (Rajkot, Gondal, Saurashtra APMC yards), with industry/business as the second focus.
Story:
Title: ${it.title}
Details: ${it.description || '(only the headline is available)'}
Source: ${it.publisher}

${langLine}
Return ONLY a JSON object with keys:
"headline": punchy headline, max 12 words,
"summary": 2-3 short factual sentences (max 55 words). Do not invent facts beyond the story,
"keywords": array of 5-8 keywords,
"hashtags": array of 5-8 hashtags each starting with #,
"category": one of ${CATEGORIES.join(', ')},
"score": integer 1-10 for how postworthy this is for the page (agriculture/mandi prices/weather-for-farmers highest, industry next, Rajkot/Saurashtra boost),
"caption": Instagram caption (2-4 lines incl. a call to follow the page; no hashtags).`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY as string, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 700, temperature: 0.3, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(30000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.message || `HTTP ${r.status}`;
    const err: any = new Error(msg);
    err.status = r.status;
    throw err;
  }
  const text: string = j.content?.map((c: any) => c.text || '').join('') || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in Claude response');
  const o = JSON.parse(m[0]);
  const tags = (o.hashtags || []).map((h: string) => (h.startsWith('#') ? h : `#${h}`).replace(/\s+/g, '')).slice(0, 8);
  return {
    headline: String(o.headline || it.title).trim(),
    summary: String(o.summary || '').trim(),
    keywords: (o.keywords || []).map(String).slice(0, 8),
    hashtags: tags,
    category: CATEGORIES.includes(o.category) ? o.category : it.category,
    score: Math.max(1, Math.min(10, Math.round(Number(o.score) || 5))),
    caption: String(o.caption || '').trim(),
    summarizer: 'claude',
    model,
  };
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
    .filter((s) => s.length > 25 && !clean.startsWith(s.slice(0, 30)) && !/follow|read more|click here|subscribe|ફોલો કરો/i.test(s));
  let summary = [split ? parts.slice(1).join(': ') + '.' : '', ...sentences].filter(Boolean).slice(0, 3).join(' ');
  if (summary.length > 320) summary = summary.slice(0, 317).replace(/\s+\S*$/, '') + '…';
  if (!summary) summary = it.lang === 'gu' || lang === 'gu' ? `${clean}. સ્રોત: ${it.publisher}.` : `${clean}. Reported by ${it.publisher}.`;

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
  return { headline, summary, keywords, hashtags, category: it.category, score, caption, summarizer: 'extractive' };
}

/** Claude first; on any failure fall back to the extractive summariser so the demo never breaks. */
export async function summarize(it: In, lang: 'en' | 'gu', model: string, wsId: number): Promise<Summary> {
  const st = aiStatus();
  if (st.available) {
    try {
      const s = await claude(it, lang, model);
      kvSet('claude_last_ok', String(Date.now()));
      kvSet('claude_last_error', '');
      return s;
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 200);
      kvSet('claude_last_error', msg);
      // Back off for billing/auth/model errors so we don't spam the API
      if ([400, 401, 403, 404, 429].includes(e?.status)) kvSet('claude_down_until', String(Date.now() + 15 * 60e3));
      log(wsId, 'warn', `Claude unavailable (${msg}) → using extractive summariser`);
    }
  }
  return extractive(it, lang);
}
