import { listWorkspaces } from '@/lib/db';
import { latestStories } from '@/lib/queries';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';

export function portalWorkspace() { return listWorkspaces()[0]; }

export function PortalShell({ children }: { children: React.ReactNode }) {
  const ws = portalWorkspace();
  const s = ws.settings;
  const brand = { brandName: s.brandName, brandTag: s.brandTag, logoUrl: s.logoUrl, whatsapp: s.whatsapp, location: s.location, handle: s.handle, appLine: s.appLine };
  const ticker = latestStories(ws.id, 14).map((x) => ({ id: x.id, title: x.title }));
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader brand={brand} ticker={ticker} />
      <main className="flex-1">{children}</main>
      <SiteFooter brand={brand} />
    </div>
  );
}

export function SectionTitle({ id, kicker, title, href, tone = 'brand' }: { id?: string; kicker: string; title: string; href?: string; tone?: 'brand' | 'agri' | 'industry' }) {
  const bar = tone === 'agri' ? 'bg-agri' : tone === 'industry' ? 'bg-industry' : 'bg-brand-red';
  return (
    <div id={id} className="mb-5 flex scroll-mt-28 items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className={`h-8 w-1.5 rounded-full ${bar}`} />
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{kicker}</div>
          <h2 className="gu text-2xl font-extrabold tracking-tight">{title}</h2>
        </div>
      </div>
      {href ? <a href={href} className="text-sm font-medium text-muted-foreground transition hover:text-primary">View all →</a> : null}
    </div>
  );
}
