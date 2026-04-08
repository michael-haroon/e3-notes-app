import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { getNoteWithPermission } from "@/actions/notes";
import Link from "next/link";
import { NoteDetail } from "@/components/notes/NoteDetail";
import { isAtLeast } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export default async function NotePage({
  params,
}: {
  params: { noteId: string };
}) {
  
  const session = await getSession().catch(() => null); if (!session) redirect("/login");

  try {
    const note = await getNoteWithPermission(params.noteId);
    const role = (session.activeOrgRole ?? "MEMBER") as Role;
    const isAuthor = note.authorId === session.user.id;
    const canEdit = isAuthor;
    const canDelete = isAuthor || isAtLeast(role, Role.ADMIN);

    // Load org members for the share panel (only when author + private)
    const orgMembers =
      isAuthor && note.visibility === "PRIVATE" && session.activeOrgId
        ? await db.orgMember.findMany({
            where: { orgId: session.activeOrgId },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { joinedAt: "asc" },
          }).then((ms) => ms.filter((m) => m.userId !== session.user.id))
        : [];

    return (
      <NoteDetail
        note={note}
        canEdit={canEdit}
        canDelete={canDelete}
        isAuthor={isAuthor}
        orgMembers={orgMembers}
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
