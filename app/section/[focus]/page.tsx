import Portal from '@/app/page';
export const dynamic = 'force-dynamic';
/** Static-friendly section page (/section/agri/) — same view as /?focus=agri. */
export default async function SectionPage({ params }: { params: Promise<{ focus: string }> }) {
  const { focus } = await params;
  return <Portal searchParams={Promise.resolve({ focus })} />;
}
