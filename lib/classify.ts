import type { Focus } from './sources';

const AGRI = ['agricultur', 'farmer', 'farming', 'farm ', 'crop', 'mandi', 'apmc', 'market yard', 'marketing yard', 'cotton', 'groundnut', 'peanut', 'jeera', 'cumin', 'irrigation', 'monsoon', 'rainfall', 'unseasonal rain', 'fertili', ' urea ', 'dairy', 'amul', 'milk', 'kharif', ' rabi ', 'msp', 'wheat', 'onion', 'harvest', 'kisan', 'sowing', 'castor', 'sesame', 'agri', 'horticulture', 'cattle', 'livestock', 'natural farming', 'organic farming', 'millet', 'seeds', 'pesticide', 'krishi', 'ખેડૂત', 'ખેતી', 'કૃષિ', 'યાર્ડ', 'મગફળી', 'કપાસ', 'જીરુ', 'જીરું', 'વરસાદ', 'ચોમાસ', 'સિંચાઈ', 'ખાતર', 'ડેરી', 'દૂધ', 'ડુંગળી', 'ઘઉં', 'માવઠ', ' મણ', 'ટેકાના ભાવ', 'પશુપાલ', 'માલધારી', 'બિયારણ', 'એરંડા', 'લસણ', 'મરચા', 'કેરી'];
const INDUSTRY = ['industr', 'gidc', 'factory', 'manufactur', 'investment', 'investor', ' mou ', 'msme', 'semiconductor', ' port ', 'textile', 'diamond', 'ceramic', 'export', 'startup', 'refinery', ' plant ', 'vibrant gujarat', 'economy', 'trade fair', 'jobs', 'gift city', 'sez', 'ઉદ્યોગ', 'ફેક્ટરી', 'રોકાણ', 'કાપડ', 'હીરા', 'સિરામિક', 'નિકાસ', 'ઔદ્યોગિક', 'જીઆઈડીસી', 'વેપાર-ઉદ્યોગ', 'કંપની', 'પ્લાન્ટ'];
const RAJKOT = ['rajkot', 'રાજકોટ', 'gondal', 'ગોંડલ', 'saurashtra', 'સૌરાષ્ટ્ર', 'morbi', 'મોરબી', 'jamnagar', 'જામનગર', 'junagadh', 'જૂનાગઢ', 'amreli', 'અમરેલી', 'jetpur', 'જેતપુર', 'upleta', 'dhoraji', 'ધોરાજી'];
const CATS: [string, string[]][] = [
  ['Weather', ['weather', 'cyclone', 'heatwave', 'cold wave', 'imd', 'temperature', 'હવામાન', 'ઠંડી', 'ગરમી', 'વાવાઝોડ']],
  ['Politics', ['bjp', 'congress', ' aap ', 'election', 'minister', ' cm ', 'chief minister', 'assembly', 'mla', ' mp ', 'ચૂંટણી', 'મંત્રી', 'મુખ્યમંત્રી', 'ભાજપ', 'કોંગ્રેસ', 'ધારાસભ']],
  ['Crime', ['police', 'arrest', 'murder', 'crime', 'fraud', 'scam', 'accused', 'court', 'પોલીસ', 'ધરપકડ', 'હત્યા', 'કોર્ટ', 'ઠગાઈ', 'છેતરપિંડી', 'ખંડણી', 'આરોપી', 'ચોરી']],
  ['Sports', ['cricket', 'match', 'tournament', 'olympic', 'saurashtra cricket', 'ipl', 'ક્રિકેટ', 'મેચ']],
  ['Health', ['hospital', 'health', 'doctor', 'disease', 'dengue', 'હોસ્પિટલ', 'આરોગ્ય']],
  ['Education', ['school', 'university', 'exam', 'student', 'gseb', 'શાળા', 'પરીક્ષા', 'વિદ્યાર્થી']],
];

// Hard-news words: crime/accident stories only get an agri/industry tag when the topic hits are strong.
const HARD = ['police', 'arrest', 'murder', 'extortion', 'accident', 'killed', 'attack', 'leopard', 'lion', 'પોલીસ', 'ધરપકડ', 'હત્યા', 'ખંડણી', 'અકસ્માત', 'હુમલ', 'મોત', 'દીપડ', 'સિંહ', 'આરોપી', 'કતલ', 'ધરણ'];
const has = (t: string, list: string[]) => list.filter((k) => t.includes(k)).length;

const norm = (x: string) => ` ${(x || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')} `;

export function classify(title: string, desc: string, sourceFocus: Focus) {
  const T = norm(title), D = norm(desc);
  const t = T + D;
  // Title hits count double; a story needs a title hit or 2+ body hits to be tagged agri/industry.
  const aT = has(T, AGRI), aD = has(D, AGRI), iT = has(T, INDUSTRY), iD = has(D, INDUSTRY);
  // Needs a title hit, or 3+ body hits, to count at all
  const hard = has(T, HARD) > 0;
  let aHits = aT || aD >= 3 ? aT * 2 + aD : 0;
  let iHits = iT || iD >= 3 ? iT * 2 + iD : 0;
  if (hard && aHits < 4) aHits = 0;
  if (hard && iHits < 4) iHits = 0;
  const a = aHits + (sourceFocus === 'agri' ? 1 : 0);
  const i = iHits + (sourceFocus === 'industry' ? 1 : 0);
  const r = has(T, RAJKOT) * 2 + has(D, RAJKOT) + (sourceFocus === 'rajkot' ? 1 : 0);
  let focus: Focus = 'general';
  let category = 'Gujarat';
  if (aHits >= 2 && a >= i) { focus = 'agri'; category = 'Agriculture'; }
  else if (iHits >= 2) { focus = 'industry'; category = 'Industry'; }
  else if (aHits >= 2) { focus = 'agri'; category = 'Agriculture'; }
  else {
    for (const [c, ks] of CATS) if (has(t, ks)) { category = c; break; }
    if (r > 0) focus = 'rajkot';
  }
  const rajkot = has(T, RAJKOT) > 0 || (sourceFocus === 'rajkot' && r > 1);
  // Priority: agriculture first, industry close second, Rajkot/Saurashtra geographic boost
  const priority = (focus === 'agri' ? 6 : focus === 'industry' ? 4.5 : 0) + (rajkot ? 3 : 0) + Math.min(aHits, 4) * 0.4 + Math.min(iHits, 4) * 0.25;
  return { focus, category, rajkot, priority };
}

export const FOCUS_LABEL: Record<string, string> = { agri: 'Agriculture', industry: 'Industry', rajkot: 'Rajkot', general: 'Gujarat' };
