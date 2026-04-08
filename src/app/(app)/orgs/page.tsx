import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { OrgSettings } from "@/components/orgs/OrgSettings";
import { isAtLeast } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";

export default async function OrgsPage() {
  
  const session = await getSession().catch(() => null); if (!session) redirect("/login");

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
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">Org Settings</h1>
          <p className="text-sm text-dim mt-1">{membership.org.name}</p>
        </div>
        {isAtLeast(membership.role as Role, Role.ADMIN) && (
          <Link href="/audit" className="text-[12px] font-medium text-[var(--accent)] hover:underline">
            View Audit Log →
          </Link>
        )}
      </div>
      <OrgSettings
        org={membership.org}
        currentRole={membership.role}
        currentUserId={session.user.id}
        members={members}
        pendingInvites={invites}
      />
    </div>
  );
}
