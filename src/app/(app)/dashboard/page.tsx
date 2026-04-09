import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NotesWorkspace } from "@/components/notes/NotesWorkspace";
import { Visibility, Role } from "@/generated/prisma/enums";
import { isAtLeast } from "@/lib/permissions";

export default async function DashboardPage() {
  
  const session = await getSession().catch(() => null); if (!session) redirect("/login");

  const orgId = session.activeOrgId;
  const userId = session.user.id;

  if (!orgId) {
    const pendingInviteCount = await db.orgInvite.count({
      where: { email: session.user.email, usedAt: null, expiresAt: { gt: new Date() } },
    });
    return (
      <div className="flex items-center justify-center min-h-full py-24 px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink mb-2">No organization yet</h1>
          <p className="text-sm text-dim mb-8 leading-relaxed">Create a team workspace or accept a pending invite to get started.</p>
          <div className="flex flex-col gap-3">
            {pendingInviteCount > 0 && (
              <Link href="/invites" className="flex items-center justify-center gap-2 bg-[var(--accent)] text-white px-6 py-2.5 rounded-card hover:bg-[var(--accent-hover)] font-medium text-sm transition-colors">
                Check Invites
                <span className="bg-white/25 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingInviteCount}</span>
              </Link>
            )}
            <Link href="/invites" className="text-sm text-dim hover:text-ink transition-colors">
              Check invites inbox
            </Link>
            <Link href="/orgs/new" className="border border-[var(--border-color)] text-dim px-6 py-2.5 rounded-card hover:bg-subtle text-sm transition-colors">
              Create organization
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const role = (session.activeOrgRole ?? "MEMBER") as Role;
  const isPrivileged = isAtLeast(role, Role.ADMIN);

  const noteWhere = {
    orgId,
    ...(isPrivileged
      ? {}
      : {
          OR: [
            { visibility: Visibility.ORG },
            { authorId: userId },
            { shares: { some: { userId } } },
          ],
        }),
  };

  const [notes, totalNotes] = await Promise.all([
    db.note.findMany({
      where: noteWhere,
      select: {
        id: true,
        title: true,
        content: true,
        visibility: true,
        authorId: true,
        pinnedAt: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, email: true } },
        tags: { select: { tag: { select: { id: true, name: true } } } },
        _count: { select: { versions: true, files: true } },
      },
      orderBy: [{ pinnedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 100,
    }),
    db.note.count({ where: noteWhere }),
  ]);

  const authorMap = new Map<string, { id: string; label: string }>();
  for (const note of notes) {
    if (!authorMap.has(note.author.id)) {
      authorMap.set(note.author.id, {
        id: note.author.id,
        label: note.author.name ?? note.author.email,
      });
    }
  }
  const authors = Array.from(authorMap.values());

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">
            {session.activeOrgName}
          </h1>
          <p className="text-sm text-dim mt-0.5">
            Browse, search, sort, and filter your team&apos;s notes in one place
          </p>
        </div>
        <Link
          href="/notes/new"
          className="flex items-center gap-1.5 bg-[var(--accent)] text-white px-4 py-2 rounded-card text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Note
        </Link>
      </div>

      <NotesWorkspace
        notes={notes}
        totalNotes={totalNotes}
        currentUserId={userId}
        authors={authors}
      />
    </div>
  );
}
