/* eslint-disable @next/next/no-img-element */
import { timeAgo } from '@/lib/queries';

const grad: Record<string, string> = {
  agri: 'from-emerald-700 via-lime-600 to-yellow-400',
  industry: 'from-slate-800 via-indigo-800 to-sky-600',
  rajkot: 'from-orange-700 via-rose-600 to-amber-400',
  general: 'from-orange-600 via-red-600 to-purple-800',
};
const word: Record<string, string> = { agri: 'ખેતી', industry: 'ઉદ્યોગ', rajkot: 'રાજકોટ', general: 'ગુજરાત' };

export function Thumb({ it, className = '' }: { it: any; className?: string }) {
  if (it.image_url) return <img src={it.image_url} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} referrerPolicy="no-referrer" />;
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${grad[it.focus] || grad.general} ${className}`}>
      <span className="text-4xl font-black text-white/30">{word[it.focus] || 'ગુજરાત'}</span>
    </div>
  );
}

export function NewsCard({ it, big = false }: { it: any; big?: boolean }) {
  return (
    <a href={it.link} target="_blank" rel="noreferrer" className="group card overflow-hidden flex flex-col hover:shadow-md transition">
      <div className={`${big ? 'aspect-[16/9]' : 'aspect-[16/10]'} overflow-hidden bg-slate-100`}>
        <Thumb it={it} className="group-hover:scale-105 transition duration-500" />
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 text-xs">
          <span className={`pill ${it.focus === 'agri' ? 'bg-emerald-100 text-emerald-800' : it.focus === 'industry' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'}`}>{it.category}</span>
          {it.post_id ? <span className="pill bg-slate-900 text-white">AI summary</span> : null}
        </div>
        <h3 className={`${big ? 'text-xl md:text-2xl' : 'text-base'} font-bold leading-snug group-hover:text-orange-700`}>{it.headline || it.title}</h3>
        {it.summary ? <p className="text-sm text-slate-600 line-clamp-3">{it.summary}</p> : null}
        <div className="mt-auto pt-2 text-xs text-slate-500">{it.publisher} · {timeAgo(it.published_at)}</div>
      </div>
    </a>
  );
}
