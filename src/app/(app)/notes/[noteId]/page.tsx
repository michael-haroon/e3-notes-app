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

    // Load org members for share panel + @mention highlighting
    const orgMembers = session.activeOrgId
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
        currentUserId={session.user.id}
      />
    );
  } catch (err) {
    if (err instanceof Error && err.message === "Note not found") {
      notFound();
    }
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-24">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-bad-soft text-bad">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm9-3.758c0 4.971-4.029 9-9 9s-9-4.029-9-9 4.029-9 9-9 9 4.029 9 9z" />
            </svg>
          </div>
          <h1 className="mb-2 font-display text-2xl font-semibold text-ink">Access Denied</h1>
          <p className="mb-4 text-sm text-dim">You don&apos;t have permission to view this note.</p>
          <Link href="/dashboard" className="text-sm font-medium text-[var(--accent)] hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }
}
