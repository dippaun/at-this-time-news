import Link from 'next/link';
import { MessageCircle, MapPin } from 'lucide-react';
import { Instagram } from '@/components/ui/icons';
import { BrandMark } from './brand';

export function SiteFooter({ brand }: { brand: any }) {
  return (
    <footer className="mt-20 border-t bg-muted/30">
      <div className="container grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <BrandMark s={brand} />
          <p className="gu mt-4 max-w-md text-sm text-muted-foreground">{brand.appLine}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5"><MessageCircle className="size-4 text-emerald-500" />{brand.whatsapp}</span>
            <span className="gu inline-flex items-center gap-1.5"><MapPin className="size-4 text-brand-red" />{brand.location}</span>
            <span className="inline-flex items-center gap-1.5"><Instagram className="size-4 text-pink-500" />{brand.handle}</span>
          </div>
        </div>
        <div>
          <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Sections</div>
          <ul className="gu space-y-2 text-sm">
            <li><Link href="/?focus=agri#feed" className="hover:text-primary">ખેતી અને મંડી</Link></li>
            <li><Link href="/?focus=industry#feed" className="hover:text-primary">ઉદ્યોગ અને વેપાર</Link></li>
            <li><Link href="/?city=rajkot#feed" className="hover:text-primary">રાજકોટ</Link></li>
            <li><a href="/api/epaper" target="_blank" className="hover:text-primary">ઈ-પેપર</a></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Studio</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/dashboard" className="hover:text-primary">Dashboard</Link></li>
            <li><Link href="/dashboard/queue" className="hover:text-primary">Post queue</Link></li>
            <li><Link href="/login" className="hover:text-primary">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t"><div className="container flex flex-wrap items-center justify-between gap-2 py-5 text-[12px] text-muted-foreground"><span>© {new Date().getFullYear()} {brand.brandName} {brand.brandTag}. Demo build.</span><span>Stories link to their original publishers. Updated every 5 minutes.</span></div></div>
    </footer>
  );
}
