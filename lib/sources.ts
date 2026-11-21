export type Focus = 'agri' | 'industry' | 'rajkot' | 'general';
export type SourceSeed = { name: string; url: string; lang: 'en' | 'gu'; focus: Focus };

const g = (q: string, lang: 'en' | 'gu') =>
  lang === 'gu'
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=gu&gl=IN&ceid=IN:gu`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;

// All feeds below were verified to return items on 21 Nov 2026.
export const DEFAULT_SOURCES: SourceSeed[] = [
  // Agriculture (primary focus)
  { name: 'Google News · Gujarat agriculture', url: g('Gujarat agriculture OR farmers OR crop OR mandi when:3d', 'en'), lang: 'en', focus: 'agri' },
  { name: 'Google News · Rajkot / Gondal APMC', url: g('Rajkot APMC OR "Gondal yard" OR "Rajkot yard" OR Saurashtra farmers OR groundnut OR cotton Gujarat when:7d', 'en'), lang: 'en', focus: 'agri' },
  { name: 'Google News · Gujarat monsoon & irrigation', url: g('Gujarat monsoon farmers OR irrigation OR "Narmada water" OR fertiliser OR dairy Amul when:7d', 'en'), lang: 'en', focus: 'agri' },
  { name: 'Google સમાચાર · માર્કેટ યાર્ડ ભાવ', url: g('માર્કેટ યાર્ડ ભાવ when:3d', 'gu'), lang: 'gu', focus: 'agri' },
  { name: 'Google સમાચાર · રાજકોટ / ગોંડલ યાર્ડ', url: g('રાજકોટ યાર્ડ OR ગોંડલ યાર્ડ OR મગફળી OR કપાસ OR જીરું when:7d', 'gu'), lang: 'gu', focus: 'agri' },
  { name: 'Google સમાચાર · ખેડૂત / ખેતી', url: g('ખેડૂત ગુજરાત OR ખેતી OR કૃષિ OR માવઠું when:3d', 'gu'), lang: 'gu', focus: 'agri' },
  // Industry (close second)
  { name: 'Google News · Gujarat industry', url: g('Gujarat industry OR GIDC OR investment OR manufacturing OR MSME when:3d', 'en'), lang: 'en', focus: 'industry' },
  { name: 'Google News · Rajkot / Morbi industry', url: g('Rajkot industry OR Morbi ceramic OR Rajkot engineering when:7d', 'en'), lang: 'en', focus: 'industry' },
  { name: 'Google સમાચાર · ગુજરાત ઉદ્યોગ', url: g('ગુજરાત ઉદ્યોગ OR જીઆઈડીસી OR રોકાણ when:3d', 'gu'), lang: 'gu', focus: 'industry' },
  // Rajkot (top geography)
  { name: 'Google News · Rajkot', url: g('Rajkot when:2d', 'en'), lang: 'en', focus: 'rajkot' },
  { name: 'Google સમાચાર · રાજકોટ', url: g('રાજકોટ when:2d', 'gu'), lang: 'gu', focus: 'rajkot' },
  { name: 'Times of India · Rajkot', url: 'https://timesofindia.indiatimes.com/rssfeeds/3942663.cms', lang: 'en', focus: 'rajkot' },
  // General Gujarat
  { name: 'Google News · Gujarat', url: g('Gujarat when:1d', 'en'), lang: 'en', focus: 'general' },
  { name: 'Google સમાચાર · ગુજરાત', url: g('ગુજરાત when:1d', 'gu'), lang: 'gu', focus: 'general' },
  { name: 'Divya Bhaskar · મારું ગુજરાત', url: 'https://www.divyabhaskar.co.in/rss-feed/1035/', lang: 'gu', focus: 'general' },
  { name: 'Sandesh (via Google News)', url: g('site:sandesh.com when:2d', 'gu'), lang: 'gu', focus: 'general' },
  { name: 'Gujarat Samachar (via Google News)', url: g('site:gujaratsamachar.com when:2d', 'gu'), lang: 'gu', focus: 'general' },
  { name: 'DeshGujarat', url: 'https://www.deshgujarat.com/feed/', lang: 'en', focus: 'general' },
  { name: 'Times of India · Ahmedabad', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128821153.cms', lang: 'en', focus: 'general' },
  { name: 'Times of India · Surat', url: 'https://timesofindia.indiatimes.com/rssfeeds/3942660.cms', lang: 'en', focus: 'general' },
  { name: 'Times of India · Vadodara', url: 'https://timesofindia.indiatimes.com/rssfeeds/3942666.cms', lang: 'en', focus: 'general' },
  { name: 'Indian Express · Ahmedabad', url: 'https://indianexpress.com/section/cities/ahmedabad/feed/', lang: 'en', focus: 'general' },
];
