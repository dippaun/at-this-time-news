import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div className="container space-y-6 py-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-12"><Skeleton className="aspect-[16/9] lg:col-span-8" /><div className="space-y-3 lg:col-span-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div></div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-72" />)}</div>
    </div>
  );
}
