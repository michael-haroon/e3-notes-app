import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { VersionsView } from "@/components/notes/VersionsView";

export default async function VersionsPage({ params }: { params: { noteId: string } }) {
  
  const session = await getSession().catch(() => null); if (!session) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-1.5 text-[12px] text-dim mb-6">
        <Link href="/dashboard" className="hover:text-ink transition-colors">Notes</Link>
        <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <Link href={`/notes/${params.noteId}`} className="hover:text-ink transition-colors">Note</Link>
        <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-ink">Version History</span>
      </div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-7 tracking-tight">Version History</h1>
      <VersionsView noteId={params.noteId} />
    </div>
  );
}
