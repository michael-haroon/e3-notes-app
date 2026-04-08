import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { Role } from "@/generated/prisma/enums";
import { isAtLeast } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Auth check — redirect to login only if not authenticated
  const { userId } = await auth();
  if (!userId) redirect("/login");

  // Session + DB sync — separate from auth so a DB error doesn't
  // send an authenticated user to /login (which causes an infinite loop)
  let session;
  try {
    session = await getSession();
  } catch (err) {
    // DB error after successful auth — show a recoverable error page
    // instead of redirecting (which would loop with Clerk's client-side nav)
    console.error("[AppLayout] getSession failed:", err);
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <div className="text-center max-w-sm">
          <h1 className="font-display text-xl font-semibold text-ink mb-2">Something went wrong</h1>
          <p className="text-sm text-dim mb-4">We couldn&apos;t load your profile. Please try refreshing.</p>
          <a href="/dashboard" className="text-sm text-[var(--accent)] hover:underline">Refresh</a>
        </div>
      </div>
    );
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
