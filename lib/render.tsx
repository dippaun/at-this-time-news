/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import type { WorkspaceSettings } from './db';

export const W = 1080, H = 1350;
export const TEMPLATES = [
  { id: 'breaking', name: 'Breaking Bold', desc: 'Dark, high-contrast breaking-news card' },
  { id: 'clean', name: 'Clean Card', desc: 'Light editorial card with summary' },
  { id: 'mandi', name: 'Mandi Bulletin', desc: 'Green agri bulletin, built for farmers' },
] as const;

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');
let fonts: any[] | null = null;
function getFonts() {
  if (!fonts) {
    const f = (n: string) => fs.readFileSync(path.join(FONT_DIR, n));
    fonts = [
      { name: 'Noto Sans', data: f('NotoSans-Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Noto Sans', data: f('NotoSans-Bold.ttf'), weight: 700, style: 'normal' },
      { name: 'Noto Sans', data: f('NotoSans-Black.ttf'), weight: 900, style: 'normal' },
      { name: 'Noto Sans Gujarati', data: f('NotoSansGujarati-Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Noto Sans Gujarati', data: f('NotoSansGujarati-Bold.ttf'), weight: 700, style: 'normal' },
      { name: 'Noto Sans Gujarati', data: f('NotoSansGujarati-Bold.ttf'), weight: 900, style: 'normal' },
    ];
  }
  return fonts;
}

export type FrameData = {
  headline: string; summary: string; keywords: string[]; category: string; focus: string;
  source: string; publishedAt: number; image: string | null; lang: string; rajkot: boolean;
};

export const fmtIST = (ts: number) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ts)) + ' IST';

const FAMILY = 'Noto Sans, Noto Sans Gujarati';
const isGu = (s: string) => /[\u0A80-\u0AFF]/.test(s);
const headSize = (h: string, base: number) => {
  const n = h.length * (isGu(h) ? 1.15 : 1);
  return n < 45 ? base : n < 70 ? base - 8 : n < 95 ? base - 16 : base - 22;
};

function Logo({ s, size = 64, dark = true }: { s: WorkspaceSettings; size?: number; dark?: boolean }) {
  const initials = s.brandName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      {s.logoUrl ? (
        <img src={s.logoUrl} width={size} height={size} style={{ borderRadius: 16, objectFit: 'cover' }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: 16, background: s.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.42, fontWeight: 900 }}>{initials}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: dark ? '#fff' : '#111827', letterSpacing: -0.5 }}>{s.brandName}</div>
        <div style={{ fontSize: 22, color: dark ? '#cbd5e1' : '#6b7280', fontWeight: 700 }}>{s.tagline}</div>
      </div>
    </div>
  );
}

function Placeholder({ s, d, h, radius = 0 }: { s: WorkspaceSettings; d: FrameData; h: number; radius?: number }) {
  const word = d.focus === 'agri' ? 'ખેતી' : d.focus === 'industry' ? 'ઉદ્યોગ' : d.rajkot ? 'રાજકોટ' : 'ગુજરાત';
  return (
    <div style={{ width: '100%', height: h, borderRadius: radius, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
      background: d.focus === 'agri' ? 'linear-gradient(135deg, #166534 0%, #65a30d 60%, #facc15 100%)' : `linear-gradient(135deg, ${s.primary} 0%, #1e1b4b 100%)` }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: 999, border: '60px solid rgba(255,255,255,0.08)', top: -250, right: -200, display: 'flex' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: 999, background: 'rgba(255,255,255,0.07)', bottom: -150, left: -100, display: 'flex' }} />
      <div style={{ fontSize: 190, fontWeight: 900, color: 'rgba(255,255,255,0.22)' }}>{word}</div>
    </div>
  );
}

function Chips({ items, color, bg, border }: { items: string[]; color: string; bg: string; border: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {items.slice(0, 5).map((k, i) => (
        <div key={i} style={{ display: 'flex', fontSize: 24, fontWeight: 700, color, background: bg, border: `2px solid ${border}`, padding: '8px 20px', borderRadius: 999 }}>#{k.replace(/^#/, '')}</div>
      ))}
    </div>
  );
}

function label(d: FrameData) {
  if (d.focus === 'agri') return d.lang === 'gu' ? 'ખેતી સમાચાર' : 'AGRI NEWS';
  if (d.focus === 'industry') return d.lang === 'gu' ? 'ઉદ્યોગ' : 'INDUSTRY';
  return d.lang === 'gu' ? 'તાજા સમાચાર' : 'BREAKING';
}

function Breaking({ s, d }: { s: WorkspaceSettings; d: FrameData }) {
  return (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: '#0b0b10', fontFamily: FAMILY, color: '#fff' }}>
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', background: '#0b0b10' }}>
        <Logo s={s} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#dc2626', padding: '12px 26px', borderRadius: 12, fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>
          <div style={{ width: 16, height: 16, borderRadius: 99, background: '#fff', display: 'flex' }} />{label(d)}
        </div>
      </div>
      <div style={{ display: 'flex', position: 'relative', height: 640 }}>
        {d.image ? <img src={d.image} width={W} height={640} style={{ objectFit: 'cover' }} /> : <Placeholder s={s} d={d} h={640} />}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, display: 'flex', background: 'linear-gradient(180deg, rgba(11,11,16,0) 0%, rgba(11,11,16,1) 100%)' }} />
        <div style={{ position: 'absolute', left: 48, bottom: 24, display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', background: s.primary, padding: '8px 22px', borderRadius: 8, fontSize: 26, fontWeight: 900 }}>{d.category.toUpperCase()}</div>
          {d.rajkot ? <div style={{ display: 'flex', background: s.accent, color: '#111', padding: '8px 22px', borderRadius: 8, fontSize: 26, fontWeight: 900 }}>RAJKOT</div> : null}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 48px 0', gap: 22, flexGrow: 1 }}>
        <div style={{ display: 'flex', fontSize: headSize(d.headline, 66), fontWeight: 900, lineHeight: 1.18, letterSpacing: -0.5, lineClamp: 3 }}>{d.headline}</div>
        <div style={{ display: 'flex', width: 984, fontSize: 29, color: '#cbd5e1', lineHeight: 1.45, lineClamp: 3 }}>{d.summary}</div>
        <Chips items={d.keywords} color={s.accent} bg="rgba(255,255,255,0.04)" border={s.accent} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', height: 96, background: s.primary, fontSize: 25, fontWeight: 700 }}>
        <div style={{ display: 'flex' }}>{`${d.source} · ${fmtIST(d.publishedAt)}`}</div>
        <div style={{ display: 'flex', fontWeight: 900 }}>{s.handle}</div>
      </div>
    </div>
  );
}

function Clean({ s, d }: { s: WorkspaceSettings; d: FrameData }) {
  return (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: FAMILY, color: '#0f172a', padding: 48, gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo s={s} dark={false} />
        <div style={{ display: 'flex', fontSize: 24, color: '#64748b', fontWeight: 700 }}>{fmtIST(d.publishedAt)}</div>
      </div>
      <div style={{ display: 'flex', borderRadius: 36, overflow: 'hidden', height: 600, boxShadow: '0 20px 50px rgba(15,23,42,0.18)' }}>
        {d.image ? <img src={d.image} width={984} height={600} style={{ objectFit: 'cover' }} /> : <Placeholder s={s} d={d} h={600} radius={36} />}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', background: s.primary, color: '#fff', padding: '8px 22px', borderRadius: 999, fontSize: 24, fontWeight: 900 }}>{d.category}</div>
        {d.rajkot ? <div style={{ display: 'flex', background: '#0f172a', color: '#fff', padding: '8px 22px', borderRadius: 999, fontSize: 24, fontWeight: 900 }}>Rajkot · Saurashtra</div> : null}
      </div>
      <div style={{ display: 'flex', width: 984, fontSize: headSize(d.headline, 60), fontWeight: 900, lineHeight: 1.18, letterSpacing: -0.5, lineClamp: 3 }}>{d.headline}</div>
      <div style={{ display: 'flex', width: 984, fontSize: 28, color: '#475569', lineHeight: 1.45, lineClamp: 2 }}>{d.summary}</div>
      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chips items={d.keywords.slice(0, 3)} color={s.primary} bg="#fff" border={s.primary} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '3px solid #e2e8f0', paddingTop: 22, fontSize: 24, color: '#64748b', fontWeight: 700 }}>
        <div style={{ display: 'flex' }}>{`Source: ${d.source}`}</div>
        <div style={{ display: 'flex', color: s.primary, fontWeight: 900 }}>{s.handle}</div>
      </div>
    </div>
  );
}

function Mandi({ s, d }: { s: WorkspaceSettings; d: FrameData }) {
  const green = '#14532d';
  return (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: green, fontFamily: FAMILY, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '34px 48px' }}>
        <Logo s={s} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 900, color: '#facc15' }}>ખેડૂત બુલેટિન</div>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: '#bbf7d0', letterSpacing: 3 }}>MANDI · KHETI · BAZAAR</div>
        </div>
      </div>
      <div style={{ display: 'flex', margin: '0 48px', borderRadius: 28, overflow: 'hidden', height: 560, border: '8px solid #facc15' }}>
        {d.image ? <img src={d.image} width={968} height={544} style={{ objectFit: 'cover' }} /> : <Placeholder s={s} d={{ ...d, focus: 'agri' }} h={544} />}
      </div>
      <div style={{ display: 'flex', margin: '-34px 0 0 80px', alignSelf: 'flex-start', background: '#facc15', color: green, padding: '10px 26px', borderRadius: 10, fontSize: 28, fontWeight: 900 }}>
        {`${d.category.toUpperCase()}${d.rajkot ? ' · RAJKOT' : ''}`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '26px 48px 0', gap: 20, flexGrow: 1 }}>
        <div style={{ display: 'flex', fontSize: headSize(d.headline, 64), fontWeight: 900, lineHeight: 1.18, lineClamp: 3 }}>{d.headline}</div>
        <div style={{ display: 'flex', width: 984, fontSize: 28, color: '#dcfce7', lineHeight: 1.45, lineClamp: 3 }}>{d.summary}</div>
        <Chips items={d.keywords} color="#14532d" bg="#bbf7d0" border="#bbf7d0" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', height: 92, background: '#052e16', fontSize: 25, fontWeight: 700, color: '#bbf7d0' }}>
        <div style={{ display: 'flex' }}>{`${d.source} · ${fmtIST(d.publishedAt)}`}</div>
        <div style={{ display: 'flex', color: '#facc15', fontWeight: 900 }}>{s.handle}</div>
      </div>
    </div>
  );
}

export async function renderFrame(tpl: string, s: WorkspaceSettings, d: FrameData): Promise<Buffer> {
  const el = tpl === 'clean' ? <Clean s={s} d={d} /> : tpl === 'mandi' ? <Mandi s={s} d={d} /> : <Breaking s={s} d={d} />;
  const svg = await satori(el as any, {
    width: W, height: H, fonts: getFonts() as any,
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng();
}
