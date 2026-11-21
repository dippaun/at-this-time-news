import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-7xl font-semibold tracking-tighter text-primary">404</div>
      <p className="text-muted-foreground">This story is no longer available.</p>
      <Link href="/" className={buttonClass('secondary')}>Back to the news</Link>
    </div>
  );
}
