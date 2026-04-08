import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { Role } from "@/generated/prisma/enums";
import { isAtLeast } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }

  const [userOrgs, pendingInvites] = await Promise.all([
    db.orgMember.findMany({
      where: { userId: session.user.id },
      include: { org: true },
      orderBy: { joinedAt: "asc" },
    }),
    db.orgInvite.count({
      where: {
        email: session.user.email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  const role = (session.activeOrgRole ?? "MEMBER") as Role;
  const isAdmin = isAtLeast(role, Role.ADMIN);

  const displayName = session.user.name ?? session.user.email ?? "?";
  const userInitials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell
      orgs={userOrgs.map((m) => ({
        orgId: m.orgId,
        role: m.role,
        org: { id: m.org.id, name: m.org.name, slug: m.org.slug },
      }))}
      activeOrgId={session.activeOrgId}
      userName={displayName}
      userEmail={session.user.email}
      userInitials={userInitials}
      pendingInvites={pendingInvites}
      isAdmin={isAdmin}
      hasOrg={!!session.activeOrgId}
    >
      {children}
    </AppShell>
  );
}
