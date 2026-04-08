"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { canInviteMembers, canChangeRole, canRemoveMember } from "@/lib/permissions";
import { Role } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export async function createOrg(name: string) {
  const session = await getSession();
  const userId = session.user.id;

  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    uuidv4().slice(0, 6);

  const org = await db.$transaction(async (tx) => {
    const created = await tx.org.create({ data: { name, slug } });
    await tx.orgMember.create({
      data: { orgId: created.id, userId, role: Role.OWNER },
    });
    return created;
  });

  await writeAuditLog({
    action: "org.create",
    userId,
    orgId: org.id,
    resourceType: "org",
  });

  revalidatePath("/dashboard");
  return { success: true, orgId: org.id, slug: org.slug };
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).default(Role.MEMBER),
});

export async function inviteMember(orgId: string, input: z.infer<typeof inviteSchema>) {
  const session = await getSession();
  const userId = session.user.id;
  const data = inviteSchema.parse(input);

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) throw new Error("Not a member of this org");

  if (!canInviteMembers({ orgId, role: membership.role })) {
    throw new Error("Permission denied: must be ADMIN or OWNER to invite");
  }

  // Only allow inviting users who already have an account
  const invitedUser = await db.user.findUnique({ where: { email: data.email } });
  if (!invitedUser) throw new Error("User doesn't exist! Make sure they've registered an account first.");

  // Don't invite someone already in the org
  const existing = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: invitedUser.id } },
  });
  if (existing) throw new Error("This user is already a member of the org");

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await db.orgInvite.create({
    data: {
      orgId,
      email: data.email,
      role: data.role,
      expiresAt,
    },
  });

  await writeAuditLog({
    action: "org.invite",
    userId,
    orgId,
    resourceId: invite.id,
    resourceType: "org_invite",
    metadata: { email: data.email, role: data.role },
  });

  return { success: true, token: invite.token, inviteId: invite.id };
}

export async function acceptInvite(token: string) {
  const session = await getSession();
  const userId = session.user.id;
  const userEmail = session.user.email;

  const invite = await db.orgInvite.findUnique({ where: { token } });
  if (!invite) throw new Error("Invite not found");
  if (invite.usedAt) throw new Error("Invite already used");
  if (invite.expiresAt < new Date()) throw new Error("Invite expired");
  if (invite.email !== userEmail) throw new Error("Invite is for a different email");

  await db.$transaction(async (tx) => {
    await tx.orgInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
    await tx.orgMember.upsert({
      where: { orgId_userId: { orgId: invite.orgId, userId } },
      create: { orgId: invite.orgId, userId, role: invite.role },
      update: { role: invite.role },
    });
  });

  await writeAuditLog({
    action: "org.join",
    userId,
    orgId: invite.orgId,
    metadata: { via: "invite" },
  });

  revalidatePath("/dashboard");
  return { success: true, orgId: invite.orgId };
}

export async function changeMemberRole(
  orgId: string,
  targetUserId: string,
  newRole: Role
) {
  const session = await getSession();
  const userId = session.user.id;

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) throw new Error("Not a member of this org");

  if (!canChangeRole({ orgId, role: membership.role }, newRole)) {
    throw new Error("Permission denied");
  }

  await db.orgMember.update({
    where: { orgId_userId: { orgId, userId: targetUserId } },
    data: { role: newRole },
  });

  await writeAuditLog({
    action: "org.role_change",
    userId,
    orgId,
    resourceId: targetUserId,
    resourceType: "user",
    metadata: { newRole },
  });

  revalidatePath(`/orgs/${orgId}/members`);
  return { success: true };
}

export async function removeMember(orgId: string, targetUserId: string) {
  const session = await getSession();
  const userId = session.user.id;

  const [membership, targetMembership] = await Promise.all([
    db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } }),
    db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId: targetUserId } } }),
  ]);

  if (!membership) throw new Error("Not a member of this org");
  if (!targetMembership) throw new Error("Target user is not a member");

  if (!canRemoveMember({ orgId, role: membership.role }, targetUserId, userId)) {
    throw new Error("Permission denied");
  }

  // Cannot remove the last owner
  if (targetMembership.role === Role.OWNER) {
    const ownerCount = await db.orgMember.count({ where: { orgId, role: Role.OWNER } });
    if (ownerCount === 1) throw new Error("Cannot remove the last owner of an org");
  }

  await db.orgMember.delete({ where: { orgId_userId: { orgId, userId: targetUserId } } });

  await writeAuditLog({
    action: "org.member_remove",
    userId,
    orgId,
    resourceId: targetUserId,
    resourceType: "user",
  });

  revalidatePath("/orgs");
  return { success: true };
}

export async function leaveOrg(orgId: string) {
  const session = await getSession();
  const userId = session.user.id;

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) throw new Error("Not a member of this org");

  if (membership.role === Role.OWNER) {
    const ownerCount = await db.orgMember.count({ where: { orgId, role: Role.OWNER } });
    if (ownerCount === 1) {
      throw new Error("You are the last owner. Transfer ownership or delete the org before leaving.");
    }
  }

  await db.orgMember.delete({ where: { orgId_userId: { orgId, userId } } });

  await writeAuditLog({ action: "org.member_remove", userId, orgId, resourceId: userId, resourceType: "user", metadata: { self: true } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteOrg(orgId: string) {
  const session = await getSession();
  const userId = session.user.id;

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership || membership.role !== Role.OWNER) {
    throw new Error("Only owners can delete an org");
  }

  await db.org.delete({ where: { id: orgId } });

  await writeAuditLog({ action: "org.delete", userId, orgId, resourceType: "org", metadata: { deleted: true } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function denyInvite(inviteId: string) {
  const session = await getSession();
  const userEmail = session.user.email;

  const invite = await db.orgInvite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new Error("Invite not found");
  if (invite.email !== userEmail) throw new Error("Not your invite");

  await db.orgInvite.delete({ where: { id: inviteId } });

  revalidatePath("/invites");
  return { success: true };
}

export async function getUserOrgs() {
  const session = await getSession();
  const userId = session.user.id;

  return db.orgMember.findMany({
    where: { userId },
    include: { org: true },
    orderBy: { joinedAt: "asc" },
  });
}
