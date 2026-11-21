'use client';
import { Link2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { buttonClass } from '@/components/ui/button';
export function ShareBar({ title }: { title: string }) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  return (
    <div className="flex flex-wrap gap-2">
      <a className={buttonClass('outline', 'sm')} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`}><MessageCircle className="text-emerald-500" />WhatsApp</a>
      <button className={buttonClass('outline', 'sm')} onClick={async () => { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}><Link2 />Copy link</button>
    </div>
  );
}
