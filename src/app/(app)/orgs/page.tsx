import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { OrgSettings } from "@/components/orgs/OrgSettings";
import { isAtLeast } from "@/lib/permissions";
import { Role } from "@/generated/prisma";

export default async function OrgsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = session.activeOrgId;
  if (!orgId) redirect("/orgs/new");

  const [membership, members, invites] = await Promise.all([
    db.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: session.user.id } },
      include: { org: true },
    }),
    db.orgMember.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    db.orgInvite.findMany({
      where: { orgId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!membership) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">Org Settings</span>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-8">
        {isAtLeast(membership.role as Role, Role.ADMIN) && (
          <div className="mb-4 flex justify-end">
            <Link
              href="/audit"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              View Audit Log &rarr;
            </Link>
          </div>
        )}
        <OrgSettings
          org={membership.org}
          currentRole={membership.role}
          currentUserId={session.user.id}
          members={members}
          pendingInvites={invites}
        />
      </main>
    </div>
  );
}
