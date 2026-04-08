/**
 * Unified session helper for Clerk + our Prisma DB.
 *
 * Replaces NextAuth's `auth()` everywhere in server components and actions.
 * - Gets the authenticated Clerk user ID
 * - Finds (or creates) the matching row in our `users` table
 * - Resolves the active org from a cookie ("tn_active_org")
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma/enums";

export type SessionUser = {
  id: string;       // our DB user id (cuid)
  email: string;
  name: string | null;
};

export type AppSession = {
  user: SessionUser;
  activeOrgId: string | undefined;
  activeOrgRole: Role;
  activeOrgName: string | undefined;
};

/** Throws "Unauthorized" if not signed in. */
export async function getSession(): Promise<AppSession> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  // Find or create our DB user record
  let dbUser = await db.user.findUnique({ where: { clerkId } });

  if (!dbUser) {
    // First Clerk login — sync with an existing DB user (by email) or create new
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (!email) throw new Error("Clerk user has no email");

    dbUser = await db.user.upsert({
      where: { email },
      create: {
        email,
        name: clerkUser.fullName ?? null,
        clerkId,
      },
      update: {
        clerkId, // link existing legacy user → Clerk on first login
      },
    });
  }

  // Read active org from cookie
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("tn_active_org")?.value;

  let activeOrgId: string | undefined;
  let activeOrgRole: Role = Role.MEMBER;
  let activeOrgName: string | undefined;

  if (cookieOrgId) {
    const membership = await db.orgMember.findUnique({
      where: { orgId_userId: { orgId: cookieOrgId, userId: dbUser.id } },
      include: { org: true },
    });
    if (membership) {
      activeOrgId = membership.orgId;
      activeOrgRole = membership.role as Role;
      activeOrgName = membership.org.name;
    }
    // if membership not found, cookie is stale — fall through to first-org below
  }

  if (!activeOrgId) {
    // Fallback: first org this user belongs to
    const membership = await db.orgMember.findFirst({
      where: { userId: dbUser.id },
      include: { org: true },
      orderBy: { joinedAt: "asc" },
    });
    if (membership) {
      activeOrgId = membership.orgId;
      activeOrgRole = membership.role as Role;
      activeOrgName = membership.org.name;
    }
  }

  return {
    user: { id: dbUser.id, email: dbUser.email, name: dbUser.name },
    activeOrgId,
    activeOrgRole,
    activeOrgName,
  };
}

/** Convenience: throws if no active org. */
export async function getSessionWithOrg() {
  const session = await getSession();
  if (!session.activeOrgId) throw new Error("No active org");
  return session as AppSession & { activeOrgId: string };
}
