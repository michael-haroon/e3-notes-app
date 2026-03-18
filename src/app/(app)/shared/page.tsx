import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSharedWithMe } from "@/actions/notes";
import { NoteList } from "@/components/notes/NoteList";

export default async function SharedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const notes = await getSharedWithMe();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">Shared with me</span>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-6">
          Shared with me ({notes.length})
        </h2>
        <NoteList notes={notes} currentUserId={session.user.id} />
      </main>
    </div>
  );
}
