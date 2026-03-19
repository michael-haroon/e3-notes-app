import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OrgSwitcher } from "@/components/orgs/OrgSwitcher";
import { NoteList } from "@/components/notes/NoteList";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Visibility, Role } from "@/generated/prisma";
import { isAtLeast } from "@/lib/permissions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = session.activeOrgId;
  const userId = session.user.id;

  const userOrgs = await db.orgMember.findMany({
    where: { userId },
    include: { org: true },
    orderBy: { joinedAt: "asc" },
  });

  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Welcome to TeamNotes</h1>
          <p className="text-gray-600 mb-6">Create your first organization to get started.</p>
          <Link
            href="/orgs/new"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Organization
          </Link>
        </div>
      </div>
    );
  }

  const role = (session.activeOrgRole ?? "MEMBER") as Role;
  const isPrivileged = isAtLeast(role, Role.ADMIN);

  const notes = await db.note.findMany({
    where: {
      orgId,
      // Admin/Owner see all notes; members see ORG + their own PRIVATE + shared with them
      ...(isPrivileged
        ? {}
        : {
            OR: [
              { visibility: Visibility.ORG },
              { authorId: userId },
              { shares: { some: { userId } } },
            ],
          }),
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
      _count: { select: { versions: true, files: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-blue-600">TeamNotes</h1>
          <OrgSwitcher orgs={userOrgs} activeOrgId={orgId} />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/search" className="text-sm text-gray-600 hover:text-gray-900">
            Search
          </Link>
          <Link href="/notes/new" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">
            New Note
          </Link>
          <Link href="/orgs" className="text-sm text-gray-600 hover:text-gray-900">
            Org Settings
          </Link>
          <span className="text-sm text-gray-600">
            {session.user.name ?? session.user.email}
          </span>
          <SignOutButton />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Notes in {session.activeOrgName}
          </h2>
          <Link
            href="/notes/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            + New Note
          </Link>
        </div>

        <NoteList notes={notes} currentUserId={userId} />
      </main>
    </div>
  );
}
