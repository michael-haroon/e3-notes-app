import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getNoteWithPermission } from "@/actions/notes";
import Link from "next/link";
import { NoteDetail } from "@/components/notes/NoteDetail";

export default async function NotePage({
  params,
}: {
  params: { noteId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    const note = await getNoteWithPermission(params.noteId);
    return (
      <NoteDetail
        note={note}
        currentUserId={session.user.id}
      />
    );
  } catch (err) {
    if (err instanceof Error && err.message === "Note not found") {
      notFound();
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view this note.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }
}
