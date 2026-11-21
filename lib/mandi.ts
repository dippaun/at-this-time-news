/**
 * REAL mandi (APMC) rates — no sample data.
 *  Primary: official Rajkot APMC daily rates (apmcrajkot.com), already ₹ per 20 kg, arrivals in quintals.
 *  Optional: data.gov.in Agmarknet daily prices (resource 9ef84268-…) for other Saurashtra yards when DATA_GOV_API_KEY
 *            works (per quintal → ÷5 for 20 kg). The public sample key is usually rate-limited, so this is best-effort.
 * Cached in mandi_rates and refreshed every few hours; when a day has no data the latest real date is shown.
 */
import { db, kvGet, kvSet, log } from './db';
import { fetchWithTimeout } from './fetcher';

const RAJKOT_URL = 'https://www.apmcrajkot.com/home/get_daily_rates';
export const RAJKOT_PAGE = 'https://www.apmcrajkot.com/home/daily_rates';
const REFRESH_MS = Number(process.env.MANDI_REFRESH_HOURS || 3) * 3600e3;

const istDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d); // YYYY-MM-DD
const ddmmyyyy = (iso: string) => iso.split('-').reverse().join('/');

type Row = { commodity: string; min: number; max: number; arrival: string };
type SetIn = { yard: string; date: string; unit: string; source: string; rows: Row[] };

function store(sets: SetIn[]) {
  const d = db();
  const wsIds = (d.prepare('SELECT id FROM workspaces').all() as any[]).map((w) => w.id);
  const del = d.prepare('DELETE FROM mandi_rates WHERE ws_id=? AND yard=? AND date=? AND source=?');
  const ins = d.prepare('INSERT INTO mandi_rates (ws_id, yard, date, commodity, min_price, max_price, unit, sample, source, arrival, created_at) VALUES (?,?,?,?,?,?,?,0,?,?,?)');
  d.transaction(() => {
    for (const s of sets) for (const ws of wsIds) {
      del.run(ws, s.yard, s.date, s.source);
      for (const r of s.rows) ins.run(ws, s.yard, s.date, r.commodity, r.min, r.max, s.unit, s.source, r.arrival, Date.now());
    }
    d.prepare('DELETE FROM mandi_rates WHERE date < ?').run(istDate(new Date(Date.now() - 15 * 86400e3)));
  })();
}

async function rajkot(): Promise<SetIn | null> {
  for (let back = 0; back < 8; back++) {
    const day = istDate(new Date(Date.now() - back * 86400e3));
    try {
      const r = await fetchWithTimeout(RAJKOT_URL, 20000, {
        method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest', 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', accept: 'application/json' },
        body: back ? `date=${encodeURIComponent(ddmmyyyy(day))}` : 'date=',
      });
      if (!r.ok) continue;
      const j: any = await r.json();
      const rows: Row[] = (j.data || []).filter((x: any) => Number(x.highrate) > 0 && x.jansi_gujarati_name)
        .map((x: any) => ({ commodity: String(x.jansi_gujarati_name).trim(), min: Number(x.lowrate) || 0, max: Number(x.highrate), arrival: String(x.arrival || '').trim(), date: x.date }));
      if (rows.length) return { yard: 'રાજકોટ', date: String((j.data[0] || {}).date || day), unit: '20 કિલો', source: `APMC Rajkot (official daily rates)|${RAJKOT_PAGE}`, rows };
    } catch { /* try previous day */ }
  }
  return null;
}

// data.gov.in (Agmarknet) — optional, for other Saurashtra yards
const MARKETS: Record<string, string> = { Gondal: 'ગોંડલ', Jasdan: 'જસદણ', Morbi: 'મોરબી', Junagadh: 'જુનાગઢ', Amreli: 'અમરેલી', Jamnagar: 'જામનગર', Dhoraji: 'ધોરાજી', Jetpur: 'જેતપુર', Upleta: 'ઉપલેટા', Savarkundla: 'સાવરકુંડલા', Bhavnagar: 'ભાવનગર', Botad: 'બોટાદ', Rajkot: 'રાજકોટ' };
const COMMOD: [RegExp, string][] = [[/cotton|kapas/i, 'કપાસ'], [/ground ?nut/i, 'મગફળી'], [/wheat/i, 'ઘઉં'], [/cumin|cummin|jeera/i, 'જીરું'], [/bengal gram|chana|\bgram\(?whole|^gram/i, 'ચણા'],
  [/sesam|gingelly|\btil\b/i, 'તલ'], [/onion/i, 'ડુંગળી'], [/garlic/i, 'લસણ'], [/castor/i, 'એરંડા'], [/soya/i, 'સોયાબીન'], [/bajra|pearl millet/i, 'બાજરી'], [/moong|green gram/i, 'મગ'],
  [/urd|black gram/i, 'અડદ'], [/coriander|dhania/i, 'ધાણા'], [/maize/i, 'મકાઈ'], [/jowar|sorghum/i, 'જુવાર'], [/mustard|rapeseed/i, 'રાયડો'], [/isab|psyllium/i, 'ઇસબગુલ'],
  [/methi|fenugreek/i, 'મેથી'], [/arhar|\btur\b|red gram/i, 'તુવેર'], [/potato/i, 'બટાટા'], [/tomato/i, 'ટામેટા'], [/paddy/i, 'ડાંગર'], [/^rice/i, 'ચોખા'], [/fennel|saunf/i, 'વરિયાળી'], [/ajwan|ajwain/i, 'અજમો'], [/lemon/i, 'લીંબુ']];
const guName = (c: string) => COMMOD.find(([re]) => re.test(c))?.[1] || '';
async function dataGov(): Promise<SetIn[]> {
  const key = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
  try {
    const r = await fetchWithTimeout(`https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${key}&format=json&limit=1000&filters%5Bstate.keyword%5D=Gujarat`, 20000);
    if (!r.ok) return [];
    const j: any = await r.json();
    const by: Record<string, SetIn> = {};
    for (const x of j.records || []) {
      const m = Object.keys(MARKETS).find((k) => String(x.market || '').toLowerCase().startsWith(k.toLowerCase()));
      if (!m || m === 'Rajkot') continue; // Rajkot comes from the official yard feed
      const [dd, mm, yy] = String(x.arrival_date || '').split('/');
      if (!yy) continue;
      const date = `${yy}-${mm}-${dd}`;
      const k = `${m}|${date}`;
      by[k] = by[k] || { yard: MARKETS[m], date, unit: '20 કિલો', source: 'Agmarknet via data.gov.in (₹/quintal ÷ 5)|https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi', rows: [] };
      const name = guName(String(x.commodity || ''));
      const max = Math.round(Number(x.max_price) / 5), min = Math.round(Number(x.min_price) / 5);
      if (!name || !(max > 0)) continue;
      const ex = by[k].rows.find((r) => r.commodity === name); // several varieties -> one min–max range
      if (ex) { ex.min = Math.min(ex.min, min); ex.max = Math.max(ex.max, max); } else by[k].rows.push({ commodity: name, min, max, arrival: '' });
    }
    return Object.values(by).filter((s) => s.rows.length >= 2);
  } catch {
    return [];
  }
}

export async function refreshRates(force = false) {
  const last = Number(kvGet('mandi_last_refresh') || 0);
  if (!force && Date.now() - last < REFRESH_MS) return { skipped: true };
  kvSet('mandi_last_refresh', String(Date.now()));
  const sets: SetIn[] = [];
  const rk = await rajkot();
  if (rk) sets.push(rk);
  sets.push(...(await dataGov()));
  if (sets.length) {
    store(sets);
    log(null, 'success', `Mandi rates refreshed: ${sets.map((s) => `${s.yard} ${s.date} (${s.rows.length})`).join(', ')}`);
  } else {
    kvSet('mandi_last_refresh', String(Date.now() - REFRESH_MS + 20 * 60e3)); // retry in ~20 min
    log(null, 'warn', 'Mandi rates: no official data reachable right now — keeping the latest real rates');
  }
  return { sets: sets.map((s) => ({ yard: s.yard, date: s.date, n: s.rows.length })) };
}
