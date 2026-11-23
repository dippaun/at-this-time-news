/** Static (GitHub Pages) vs server mode helpers. Safe for client + server components. */
export const STATIC = process.env.NEXT_PUBLIC_STATIC === '1';
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Image URL for <img>: local media is served from /api/media on the server and /media on the static site. */
export const imgSrc = (u?: string | null) => (!u ? u : u.startsWith('/api/media/') ? (STATIC ? `${BASE}/media/${u.slice('/api/media/'.length)}` : u) : u);
export const epaperUrl = () => (STATIC ? `${BASE}/epaper.jpg` : '/api/epaper');
export const frameUrl = (id: number, rev: number | null | undefined, kind: 'post' | 'reel' | 'download' = 'post') =>
  STATIC ? `${BASE}/frames/${id}-${rev || 1}${kind === 'reel' ? '-reel' : ''}.jpg`
    : kind === 'reel' ? `/api/frame/${id}?format=reel` : `/api/frame/${id}?v=${rev || 1}${kind === 'download' ? '&download=1' : ''}`;
/** Feed filter link (for next/link, which adds the basePath). Static site has one page per section / city. */
export const feedHref = (focus?: string, city?: string) => {
  if (STATIC) return `${city ? `/city/${city}/` : focus && focus !== 'all' ? `/section/${focus}/` : '/'}#feed`;
  const p = new URLSearchParams(); if (focus && focus !== 'all') p.set('focus', focus); if (city) p.set('city', city);
  const s = p.toString(); return `/${s ? `?${s}` : ''}#feed`;
};
