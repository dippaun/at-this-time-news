/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import type { WorkspaceSettings, RateSet } from './db';

/**
 * AT THIS TIME MEDIA brand system (from the client's Instagram @at_this_time_jasdan).
 * Posts 1080x1350 (4:5), reels 1080x1920 (9:16). NEVER render the news source anywhere.
 */
export const W = 1080, H = 1350, RH = 1920;
export const RED = '#E31E24', GREY = '#4A4A4A', NAVY = '#1B2A5C', CREAM = '#F5F0E6', WHITE = '#FFFFFF';
export const TEMPLATES = [
  { id: 'news', name: 'News photo card', desc: 'Red headline bar, photo, sponsor strip (main format)' },
  { id: 'story', name: 'Person / story card', desc: 'Cream card, portrait right, Gujarati paragraph left' },
  { id: 'mandi', name: 'APMC market rates', desc: 'Dark grey card with commodity min/max table' },
] as const;
export const REEL_BAND = { top: 360, height: 1100 };

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');
let fonts: any[] | null = null;
function getFonts() {
  if (!fonts) {
    const f = (n: string) => fs.readFileSync(path.join(FONT_DIR, n));
    fonts = [
      { name: 'Noto Sans', data: f('NotoSans-Regular.ttf'), weight: 400 },
      { name: 'Noto Sans', data: f('NotoSans-Bold.ttf'), weight: 700 },
      { name: 'Noto Sans', data: f('NotoSans-Black.ttf'), weight: 900 },
      { name: 'Noto Sans Gujarati', data: f('NotoSansGujarati-Regular.ttf'), weight: 400 },
      { name: 'Noto Sans Gujarati', data: f('NotoSansGujarati-Bold.ttf'), weight: 700 },
      { name: 'Noto Sans Gujarati', data: f('NotoSansGujarati-ExtraBold.ttf'), weight: 800 },
      { name: 'Noto Sans Gujarati', data: f('NotoSansGujarati-Black.ttf'), weight: 900 },
      { name: 'Noto Serif Gujarati', data: f('NotoSerifGujarati-Bold.ttf'), weight: 700 },
      { name: 'Noto Serif Gujarati', data: f('NotoSerifGujarati-Black.ttf'), weight: 900 },
      { name: 'Noto Serif', data: f('NotoSerif-Bold.ttf'), weight: 700 },
    ].map((x) => ({ ...x, style: 'normal' }));
  }
  return fonts;
}

export type FrameData = {
  headline: string; summary: string; keywords: string[]; category: string; focus: string;
  publishedAt: number; image: string | null; lang: string; rajkot: boolean; reporter?: string; rates?: RateSet | null;
};
export type DigestStory = { headline: string; summary: string; image: string | null; category: string };

const SANS = 'Noto Sans Gujarati, Noto Sans';
const SERIF = 'Noto Serif Gujarati, Noto Serif, Noto Sans Gujarati';
const GU_DAYS = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'];
export function istParts(ts: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' }).formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { date: `${p.day}/${p.month}/${p.year}`, day: GU_DAYS[wd] };
}
export const dateLine = (ts: number) => { const x = istParts(ts); return `${x.date} ${x.day}`; };
export const fmtIST = (ts: number) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ts)) + ' IST';
const isGu = (s: string) => /[\u0A80-\u0AFF]/.test(s);
const fit = (h: string, sizes: [number, number][]) => { const n = h.length * (isGu(h) ? 1 : 0.92); for (const [max, sz] of sizes) if (n <= max) return sz; return sizes[sizes.length - 1][1]; };

// ---------- icons (inline SVG, no external assets) ----------
const Megaphone = ({ size = 30, color = WHITE }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);
const Pin = ({ size = 26, color = RED }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>
);
const WhatsApp = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#25D366" />
    <path fill="#fff" d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 .9-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.3 2.4.9 2.9.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3zM12 21.8c-1.7 0-3.4-.5-4.9-1.3l-.4-.2-3.6.9 1-3.5-.2-.4A9.8 9.8 0 1 1 12 21.8z" />
  </svg>
);

// ---------- shared brand blocks ----------
export function BrandPill({ s, scale = 1 }: { s: WorkspaceSettings; scale?: number }) {
  const h = 58 * scale;
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: h, borderRadius: h, border: `${3 * scale}px solid ${s.primary}`, background: WHITE, padding: 3 * scale, gap: 4 * scale }}>
      <div style={{ display: 'flex', alignItems: 'center', height: h - 12 * scale, borderRadius: h, background: s.primary, padding: `0 ${22 * scale}px 0 ${6 * scale}px`, gap: 10 * scale }}>
        {s.logoUrl ? <img src={s.logoUrl} width={h - 20 * scale} height={h - 20 * scale} style={{ borderRadius: 999, objectFit: 'cover' }} />
          : <div style={{ display: 'flex', width: h - 20 * scale, height: h - 20 * scale, borderRadius: 999, background: s.accent, alignItems: 'center', justifyContent: 'center' }}><Megaphone size={22 * scale} /></div>}
        <div style={{ display: 'flex', color: WHITE, fontSize: 26 * scale, fontWeight: 900, letterSpacing: 0.5, fontFamily: 'Noto Sans', whiteSpace: 'nowrap' }}>{s.brandName}</div>
      </div>
      {s.brandTag ? <div style={{ display: 'flex', alignItems: 'center', height: h - 12 * scale, borderRadius: h, background: s.primary, padding: `0 ${20 * scale}px`, color: WHITE, fontSize: 26 * scale, fontWeight: 900, fontFamily: 'Noto Sans' }}>{s.brandTag}</div> : null}
    </div>
  );
}

function Contact({ s, dark = false }: { s: WorkspaceSettings; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
      {s.whatsapp ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <WhatsApp size={36} />
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 900, color: dark ? WHITE : '#111', fontFamily: 'Noto Sans' }}>{s.whatsapp}</div>
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: WHITE, border: `3px solid ${dark ? WHITE : GREY}`, borderRadius: 999, padding: '4px 22px 4px 14px' }}>
        <Pin size={26} />
        <div style={{ display: 'flex', fontSize: 27, fontWeight: 800, color: '#111' }}>{s.location}</div>
      </div>
    </div>
  );
}

function TopRow({ s, d, dark = false, bg }: { s: WorkspaceSettings; d: { publishedAt: number; reporter?: string }; dark?: boolean; bg: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '22px 34px 14px', background: bg }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <BrandPill s={s} />
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, color: dark ? WHITE : s.primary, paddingLeft: 10 }}>
          {`${dateLine(d.publishedAt)}${d.reporter ? ` - ${d.reporter}` : ''}`}
        </div>
      </div>
      <Contact s={s} dark={dark} />
    </div>
  );
}

function AppLine({ s, height = 58, light = false }: { s: WorkspaceSettings; height?: number; light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height, background: light ? WHITE : '#3B3B3B', color: light ? '#222' : WHITE, fontSize: 25, fontWeight: 800, gap: 16, padding: '0 20px' }}>
      {light ? <div style={{ display: 'flex', width: 70, height: 4, background: s.primary }} /> : null}
      <div style={{ display: 'flex' }}>{s.appLine}</div>
    </div>
  );
}

function Sponsor({ s, height }: { s: WorkspaceSettings; height: number }) {
  if (s.sponsorUrl) return <div style={{ display: 'flex', height, width: W, overflow: 'hidden' }}><img src={s.sponsorUrl} width={W} height={height} style={{ objectFit: 'cover' }} /></div>;
  return (
    <div style={{ display: 'flex', height, width: W, boxSizing: 'border-box', background: `linear-gradient(100deg, ${s.accent} 0%, #26397a 55%, ${s.primary} 140%)`, alignItems: 'center', justifyContent: 'space-between', padding: '0 46px', position: 'relative' }}>
      <div style={{ display: 'flex', position: 'absolute', top: 12, right: 24, fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, fontFamily: 'Noto Sans' }}>SPONSORED</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', fontSize: height > 220 ? 58 : 46, fontWeight: 900, color: '#FFD54A' }}>આપની જાહેરાત અહીં</div>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: WHITE }}>{`સ્પોન્સર બેનર માટે સંપર્ક કરો · ${s.whatsapp}`}</div>
      </div>
      <div style={{ display: 'flex', flexShrink: 0, width: height * 0.56, height: height * 0.56, borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '4px solid rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
        <Megaphone size={height * 0.3} />
      </div>
    </div>
  );
}

function Photo({ d, s, w, h, radius = 0 }: { d: FrameData; s: WorkspaceSettings; w: number; h: number; radius?: number }) {
  if (d.image) return <img src={d.image} width={w} height={h} style={{ objectFit: 'cover', borderRadius: radius }} />;
  const word = d.focus === 'agri' ? 'ખેતી' : d.focus === 'industry' ? 'ઉદ્યોગ' : s.location || 'સમાચાર';
  return (
    <div style={{ display: 'flex', width: w, height: h, borderRadius: radius, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
      background: d.focus === 'agri' ? 'linear-gradient(140deg, #14532d 0%, #4d7c0f 55%, #ca8a04 100%)' : `linear-gradient(140deg, ${NAVY} 0%, #2b3f86 60%, ${RED} 130%)` }}>
      <div style={{ display: 'flex', position: 'absolute', width: w * 0.9, height: w * 0.9, borderRadius: 999, border: '70px solid rgba(255,255,255,0.07)', top: -w * 0.35, right: -w * 0.3 }} />
      <div style={{ display: 'flex', fontSize: Math.min(200, h * 0.32), fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>{word}</div>
    </div>
  );
}

function HeadBar({ s, d, height, size }: { s: WorkspaceSettings; d: FrameData; height: number; size: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, background: s.primary, padding: '16px 34px 18px', justifyContent: 'center', position: 'relative' }}>
      {d.reporter ? (
        <div style={{ display: 'flex', position: 'absolute', top: 14, right: 26, background: WHITE, color: '#111', borderRadius: 10, padding: '2px 16px', fontSize: 24, fontWeight: 800 }}>{`રિપોર્ટર: ${d.reporter}`}</div>
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', color: WHITE, fontSize: size, fontWeight: 900, lineHeight: 1.28, lineClamp: 2, marginTop: d.reporter ? 30 : 0 }}>{d.headline}</div>
    </div>
  );
}

// ---------- 1. News photo card (4:5) ----------
function NewsCard({ s, d }: { s: WorkspaceSettings; d: FrameData }) {
  const top = 168, bar = 236, app = 58, spon = 240, photo = H - top - bar - app - spon;
  return (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: WHITE, fontFamily: SANS }}>
      <TopRow s={s} d={{ publishedAt: d.publishedAt }} bg={WHITE} />
      <HeadBar s={s} d={d} height={bar} size={fit(d.headline, [[38, 58], [60, 52], [80, 46], [999, 42]])} />
      <div style={{ display: 'flex', height: photo, width: W, overflow: 'hidden' }}><Photo d={d} s={s} w={W} h={photo} /></div>
      <AppLine s={s} height={app} />
      <Sponsor s={s} height={spon} />
    </div>
  );
}

// ---------- 1b. Reel frame (9:16). transparentBand=true leaves the middle band empty for video ----------
function ReelFrame({ s, d, transparentBand }: { s: WorkspaceSettings; d: FrameData; transparentBand: boolean }) {
  const spon = 300, badge = 100, app = 60;
  return (
    <div style={{ width: W, height: RH, display: 'flex', flexDirection: 'column', background: transparentBand ? 'transparent' : WHITE, fontFamily: SANS }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: REEL_BAND.top, background: s.primary, padding: '22px 34px 20px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', color: WHITE, fontSize: 28, fontWeight: 800 }}>{dateLine(d.publishedAt)}</div>
          {d.reporter ? <div style={{ display: 'flex', background: WHITE, color: '#111', borderRadius: 10, padding: '2px 16px', fontSize: 26, fontWeight: 800 }}>{`રિપોર્ટર: ${d.reporter}`}</div>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: WHITE, borderRadius: 999, padding: '2px 20px 2px 12px' }}><Pin size={24} /><div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: '#111' }}>{s.location}</div></div>}
        </div>
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: WHITE, fontSize: fit(d.headline, [[40, 66], [64, 58], [90, 52], [999, 46]]), fontWeight: 900, lineHeight: 1.28, lineClamp: 3 }}>{d.headline}</div>
      </div>
      <div style={{ display: 'flex', height: REEL_BAND.height, width: W, overflow: 'hidden' }}>{transparentBand ? null : <Photo d={d} s={s} w={W} h={REEL_BAND.height} />}</div>
      <Sponsor s={s} height={spon} />
      <div style={{ display: 'flex', height: badge, background: WHITE, alignItems: 'center', justifyContent: 'center' }}><BrandPill s={s} scale={1.05} /></div>
      <AppLine s={s} height={app} light />
    </div>
  );
}

// ---------- 2. APMC market-rate card ----------
function MandiCard({ s, d }: { s: WorkspaceSettings; d: FrameData }) {
  const r = d.rates;
  const rows = (r?.rows || []).slice(0, 14);
  const day = r ? istParts(Date.parse(r.date + 'T12:00:00+05:30')) : istParts(d.publishedAt);
  const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-IN') : '-');
  const rowH = rows.length > 12 ? 44 : 50;
  return (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: GREY, fontFamily: SANS }}>
      <TopRow s={s} d={{ publishedAt: r ? Date.parse(r.date + 'T12:00:00+05:30') : d.publishedAt }} dark bg={GREY} />
      <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', color: WHITE, fontSize: 38, fontWeight: 900, padding: '0 40px 14px', lineClamp: 1 }}>{d.headline}</div>
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, margin: '0 64px 22px', background: WHITE, padding: '20px 26px', position: 'relative', boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: 31, fontWeight: 900, color: '#111' }}>{`શ્રી ${(r?.yard || s.location).replace(/\s*(માર્કેટિંગ|માર્કેટ)?\s*(યાર્ડ|apmc|એપીએમસી)\s*$/i, '') || s.location} ખેત ઉત્પન્ન બજાર સમિતિ`}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 23, fontWeight: 700, color: '#333', margin: '8px 0 12px', borderBottom: '2px solid #111', paddingBottom: 8 }}>
          <div style={{ display: 'flex' }}>{`તારીખ: ${day.date}`}</div>
          <div style={{ display: 'flex' }}>{`બજાર ભાવ (${r?.unit || '20 કિલો'})`}</div>
          <div style={{ display: 'flex' }}>{`વાર: ${day.day}`}</div>
        </div>
        <div style={{ display: 'flex', background: '#EDEDED', fontSize: 24, fontWeight: 900, color: '#111', height: rowH, alignItems: 'center', border: '2px solid #111' }}>
          <div style={{ display: 'flex', width: 80, justifyContent: 'center' }}>ક્રમ</div>
          <div style={{ display: 'flex', flexGrow: 1, paddingLeft: 14, borderLeft: '2px solid #111', height: '100%', alignItems: 'center' }}>જણસી</div>
          <div style={{ display: 'flex', width: 200, justifyContent: 'center', borderLeft: '2px solid #111', height: '100%', alignItems: 'center' }}>નીચો ભાવ</div>
          <div style={{ display: 'flex', width: 200, justifyContent: 'center', borderLeft: '2px solid #111', height: '100%', alignItems: 'center' }}>ઊંચો ભાવ</div>
        </div>
        {rows.map((x, i) => (
          <div key={i} style={{ display: 'flex', fontSize: 25, fontWeight: 700, color: '#111', height: rowH, alignItems: 'center', borderLeft: '2px solid #111', borderRight: '2px solid #111', borderBottom: '1px solid #999', background: i % 2 ? '#FAFAFA' : WHITE }}>
            <div style={{ display: 'flex', width: 78, justifyContent: 'center' }}>{String(i + 1)}</div>
            <div style={{ display: 'flex', flexGrow: 1, paddingLeft: 14, borderLeft: '2px solid #111', height: '100%', alignItems: 'center' }}>{x.commodity}</div>
            <div style={{ display: 'flex', width: 200, justifyContent: 'center', borderLeft: '2px solid #111', height: '100%', alignItems: 'center' }}>{fmt(x.min)}</div>
            <div style={{ display: 'flex', width: 200, justifyContent: 'center', borderLeft: '2px solid #111', height: '100%', alignItems: 'center', fontWeight: 900 }}>{fmt(x.max)}</div>
          </div>
        ))}
        {!rows.length ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40, fontSize: 28, color: '#666' }}>ભાવ ઉપલબ્ધ નથી</div> : null}
        {r?.sample ? (
          <div style={{ display: 'flex', position: 'absolute', bottom: 16, right: 20, background: RED, color: WHITE, fontSize: 20, fontWeight: 900, padding: '4px 14px', borderRadius: 8, fontFamily: SANS }}>નમૂના ભાવ · SAMPLE DATA</div>
        ) : null}
      </div>
      <AppLine s={s} height={58} />
      <Sponsor s={s} height={200} />
    </div>
  );
}

// ---------- 3. Person / story card ----------
function StoryCard({ s, d }: { s: WorkspaceSettings; d: FrameData }) {
  const text = `${d.headline}${/[.!?।]$/.test(d.headline) ? '' : '.'} ${d.summary}`;
  return (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: CREAM, fontFamily: SANS }}>
      <TopRow s={s} d={{ publishedAt: d.publishedAt, reporter: d.reporter }} bg={CREAM} />
      <div style={{ display: 'flex', flexGrow: 1, padding: '20px 40px 30px', gap: 34, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 560, gap: 22 }}>
          <div style={{ display: 'flex', width: 120, height: 8, background: s.primary, borderRadius: 4 }} />
          <div style={{ display: 'flex', fontSize: fit(text, [[200, 44], [280, 40], [360, 37], [999, 34]]), fontWeight: 700, color: '#1d1d1d', lineHeight: 1.6, lineClamp: 13 }}>{text}</div>
        </div>
        <div style={{ display: 'flex', flexShrink: 0, width: 406, height: 720, border: `6px solid ${GREY}`, background: WHITE, padding: 6 }}>
          <Photo d={d} s={s} w={382} h={696} />
        </div>
      </div>
      <AppLine s={s} height={58} />
      <Sponsor s={s} height={230} />
    </div>
  );
}

// ---------- 4. E-paper daily digest cover ----------
function Epaper({ s, stories, ts }: { s: WorkspaceSettings; stories: DigestStory[]; ts: number }) {
  const [lead, ...rest] = stories;
  const side = rest.slice(0, 2), bottom = rest.slice(2, 5);
  const rule = { display: 'flex', height: 3, background: '#111', width: '100%' } as const;
  return (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: '#FBFAF6', fontFamily: SERIF, color: '#111', padding: '26px 34px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontSize: s.newspaperName.length > 10 ? 92 : 120, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, flexShrink: 1 }}>{s.newspaperName}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
          <BrandPill s={s} scale={0.72} />
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, fontFamily: SANS }}>{`${s.location} · ${dateLine(ts)}`}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '4px solid #111', borderBottom: '2px solid #111', padding: '6px 0', marginTop: 6, fontFamily: SANS, fontSize: 20, fontWeight: 700 }}>
        <div style={{ display: 'flex', color: s.primary, fontWeight: 900 }}>{s.newspaperTagline}</div>
        <div style={{ display: 'flex' }}>{`વોટ્સએપ: ${s.whatsapp}`}</div>
        <div style={{ display: 'flex' }}>{dateLine(ts)}</div>
      </div>
      {lead ? <div style={{ display: 'flex', fontSize: 58, fontWeight: 900, lineHeight: 1.2, margin: '16px 0 12px', color: s.primary, lineClamp: 2 }}>{lead.headline}</div> : null}
      <div style={{ display: 'flex', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 640, flexShrink: 0, gap: 10 }}>
          {lead ? <div style={{ display: 'flex', width: 640, height: 400, overflow: 'hidden', border: '2px solid #111' }}>{lead.image ? <img src={lead.image} width={640} height={400} style={{ objectFit: 'cover' }} /> : <div style={{ display: 'flex', width: 640, height: 400, background: `linear-gradient(140deg, ${NAVY}, ${RED})` }} />}</div> : null}
          {lead ? <div style={{ display: 'flex', fontSize: 23, lineHeight: 1.5, fontFamily: SANS, textAlign: 'justify', lineClamp: 4 }}>{lead.summary}</div> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', width: 340, flexShrink: 0, gap: 14, borderLeft: '2px solid #111', paddingLeft: 18 }}>
          {side.map((x, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12, borderBottom: i === 0 ? '2px solid #111' : 'none' }}>
              {x.image ? <img src={x.image} width={320} height={150} style={{ objectFit: 'cover' }} /> : null}
              <div style={{ display: 'flex', fontSize: 28, fontWeight: 900, lineHeight: 1.25, lineClamp: 3 }}>{x.headline}</div>
              <div style={{ display: 'flex', fontSize: 19, lineHeight: 1.45, fontFamily: SANS, lineClamp: x.image ? 3 : 6 }}>{x.summary}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...rule, marginTop: 14 }} />
      <div style={{ display: 'flex', gap: 20, marginTop: 12, flexGrow: 1 }}>
        {bottom.map((x, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', width: 320, flexShrink: 0, gap: 6, borderLeft: i ? '2px solid #111' : 'none', paddingLeft: i ? 18 : 0 }}>
            <div style={{ display: 'flex', fontSize: 27, fontWeight: 900, lineHeight: 1.25, lineClamp: 2 }}>{x.headline}</div>
            <div style={{ display: 'flex', fontSize: 19, lineHeight: 1.45, fontFamily: SANS, textAlign: 'justify', lineClamp: 5 }}>{x.summary}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', background: '#111', color: WHITE, fontFamily: SANS, fontSize: 22, fontWeight: 800, padding: '8px 0', marginTop: 8 }}>{s.appLine}</div>
    </div>
  );
}

async function toPng(el: any, w: number, h: number) {
  const svg = await satori(el, { width: w, height: h, fonts: getFonts() as any });
  return new Resvg(svg, { fitTo: { mode: 'width', value: w }, font: { loadSystemFonts: false }, background: 'rgba(0,0,0,0)' }).render().asPng();
}

export async function renderFrame(tpl: string, s: WorkspaceSettings, d: FrameData): Promise<Buffer> {
  const el = tpl === 'mandi' ? <MandiCard s={s} d={d} /> : tpl === 'story' ? <StoryCard s={s} d={d} /> : <NewsCard s={s} d={d} />;
  return toPng(el, W, H);
}
export async function renderReelFrame(s: WorkspaceSettings, d: FrameData, transparentBand = false): Promise<Buffer> {
  return toPng(<ReelFrame s={s} d={d} transparentBand={transparentBand} />, W, RH);
}
export async function renderEpaper(s: WorkspaceSettings, stories: DigestStory[], ts: number): Promise<Buffer> {
  return toPng(<Epaper s={s} stories={stories} ts={ts} />, W, H);
}
