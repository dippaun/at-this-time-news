import { currentWsId } from '@/lib/auth';
import { activity, fmtTime } from '@/lib/queries';
import { AutoRefresh } from '@/components/AutoRefresh';
export const dynamic = 'force-dynamic';
const LV: Record<string, string> = { info: 'bg-slate-100 text-slate-600', warn: 'bg-amber-100 text-amber-700', error: 'bg-rose-100 text-rose-700', success: 'bg-emerald-100 text-emerald-700' };
export default async function Activity() {
  const log = activity(await currentWsId(), 300);
  return (
    <div className="space-y-6">
      <AutoRefresh seconds={20} />
      <h1 className="text-3xl font-black">Pipeline activity log</h1>
      <div className="card divide-y divide-slate-100 text-sm">
        {log.map((l) => (
          <div key={l.id} className="px-4 py-2.5 flex flex-wrap gap-3 items-start">
            <span className="text-xs text-slate-400 w-40 shrink-0 font-mono">{fmtTime(l.ts)}</span>
            <span className={`pill ${LV[l.level]} w-16 justify-center shrink-0`}>{l.level}</span>
            <span className="flex-1 min-w-[200px]">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
