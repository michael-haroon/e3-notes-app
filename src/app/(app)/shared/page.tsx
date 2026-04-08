import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSharedWithMe } from "@/actions/notes";
import { NoteList } from "@/components/notes/NoteList";

export default async function SharedPage() {
  
  const session = await getSession().catch(() => null); if (!session) redirect("/login");

  const notes = await getSharedWithMe();

  return (
    <div className="min-h-full bg-canvas">
      <nav className="flex items-center gap-4 border-b border-[var(--border-color)] bg-surface px-6 py-3">
        <Link href="/dashboard" className="text-sm text-dim transition-colors hover:text-ink">
          ← Dashboard
        </Link>
        <span className="text-muted">/</span>
        <span className="text-sm font-medium text-ink">Shared with me</span>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">
          Shared with me ({notes.length})
        </h2>
        <NoteList notes={notes} currentUserId={session.user.id} />
      </main>
    </div>
  );
}
