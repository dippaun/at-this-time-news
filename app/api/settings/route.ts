import { guard, currentWsId } from '@/lib/auth';
import { saveSettings, log } from '@/lib/db';
export async function POST(req: Request) {
  const g = await guard('admin'); if ('res' in g) return g.res;
  const ws = await currentWsId();
  const b = await req.json();
  const allowed = ['brandName', 'handle', 'tagline', 'primary', 'accent', 'logoUrl', 'language', 'template', 'maxPerRun', 'model', 'autoApproveScore', 'aiProvider', 'geminiModel', 'brandTag', 'whatsapp', 'location', 'cityTag', 'sponsorUrl', 'appLine', 'newspaperName', 'newspaperTagline', 'reporterDefault'];
  const s: any = {};
  for (const k of allowed) if (k in b) s[k] = b[k];
  if ('maxPerRun' in s) s.maxPerRun = Math.max(1, Math.min(30, Number(s.maxPerRun) || 10));
  if ('autoApproveScore' in s) s.autoApproveScore = Math.max(0, Math.min(10, Number(s.autoApproveScore) || 0));
  if ('aiProvider' in s && !['auto', 'gemini', 'claude', 'extractive'].includes(s.aiProvider)) s.aiProvider = 'auto';
  if (s.logoUrl && s.logoUrl.length > 400000) return Response.json({ error: 'Logo too large (max ~300 KB)' }, { status: 400 });
  if (s.sponsorUrl && s.sponsorUrl.length > 1500000) return Response.json({ error: 'Sponsor banner too large (max ~1 MB)' }, { status: 400 });
  if ('template' in s && !['auto', 'news', 'story', 'mandi'].includes(s.template)) s.template = 'auto';
  for (const k of Object.keys(s)) if (typeof s[k] === 'string' && !['logoUrl', 'sponsorUrl'].includes(k)) s[k] = s[k].slice(0, 300);
  saveSettings(ws, s);
  log(ws, 'info', `Settings updated by ${g.s.email}`);
  return Response.json({ ok: true });
}
