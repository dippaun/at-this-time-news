import Portal from '@/app/page';
export const dynamic = 'force-dynamic';
/** Static-friendly city page (/city/rajkot/) — same view as /?city=rajkot. */
export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  return <Portal searchParams={Promise.resolve({ city })} />;
}
