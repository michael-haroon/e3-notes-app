"use server";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { canInviteMembers, canChangeRole, canRemoveMember } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ─── Result helpers ────────────────────────────────────────────────────────────
// Next.js strips thrown error messages in production. We return errors instead
// of throwing so the message always reaches the client.

type Ok<T extends object = object> = { success: true } & T;
type Err = { success: false; error: string };
type Result<T extends object = object> = Ok<T> | Err;

function ok<T extends object>(data?: T): Ok<T> { return { success: true, ...(data ?? {}) } as Ok<T>; }
function err(message: string): Err { return { success: false, error: message }; }

// ─── Actions ───────────────────────────────────────────────────────────────────

export async function createOrg(name: string): Promise<Result<{ orgId: string; slug: string }>> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const slug =
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
      "-" + uuidv4().slice(0, 6);

    const org = await db.$transaction(async (tx) => {
      const created = await tx.org.create({ data: { name, slug } });
      await tx.orgMember.create({ data: { orgId: created.id, userId, role: Role.OWNER } });
      return created;
    });

    await writeAuditLog({ action: "org.create", userId, orgId: org.id, resourceType: "org" });
    revalidatePath("/dashboard");
    return ok({ orgId: org.id, slug: org.slug });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to create org");
  }
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).default(Role.MEMBER),
});

export async function inviteMember(
  orgId: string,
  input: z.infer<typeof inviteSchema>
): Promise<Result<{ token: string; inviteId: string }>> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const data = inviteSchema.parse(input);

    const membership = await db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
    if (!membership) return err("Not a member of this org");
    if (!canInviteMembers({ orgId, role: membership.role })) return err("Permission denied: must be ADMIN or OWNER to invite");

    const invitedUser = await db.user.findUnique({ where: { email: data.email } });
    if (!invitedUser) return err("User doesn't exist! Make sure they've registered an account first.");

    const existing = await db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId: invitedUser.id } } });
    if (existing) return err("This user is already a member of the org");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await db.orgInvite.create({ data: { orgId, email: data.email, role: data.role, expiresAt } });

    await writeAuditLog({ action: "org.invite", userId, orgId, resourceId: invite.id, resourceType: "org_invite", metadata: { email: data.email, role: data.role } });
    return ok({ token: invite.token, inviteId: invite.id });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Invite failed");
  }
}

export async function acceptInvite(token: string): Promise<Result<{ orgId: string }>> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const userEmail = session.user.email;

    const invite = await db.orgInvite.findUnique({ where: { token } });
    if (!invite) return err("Invite not found");
    if (invite.usedAt) return err("Invite already used");
    if (invite.expiresAt < new Date()) return err("Invite expired");
    if (invite.email !== userEmail) return err("Invite is for a different email");

    await db.$transaction(async (tx) => {
      await tx.orgInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
      await tx.orgMember.upsert({
        where: { orgId_userId: { orgId: invite.orgId, userId } },
        create: { orgId: invite.orgId, userId, role: invite.role },
        update: { role: invite.role },
      });
    });

    await writeAuditLog({ action: "org.join", userId, orgId: invite.orgId, metadata: { via: "invite" } });
    revalidatePath("/dashboard");
    return ok({ orgId: invite.orgId });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to accept invite");
  }
}

export async function changeMemberRole(orgId: string, targetUserId: string, newRole: Role): Promise<Result> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const membership = await db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
    if (!membership) return err("Not a member of this org");
    if (!canChangeRole({ orgId, role: membership.role }, newRole)) return err("Permission denied");

    await db.orgMember.update({ where: { orgId_userId: { orgId, userId: targetUserId } }, data: { role: newRole } });
    await writeAuditLog({ action: "org.role_change", userId, orgId, resourceId: targetUserId, resourceType: "user", metadata: { newRole } });
    revalidatePath(`/orgs/${orgId}/members`);
    return ok({});
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to change role");
  }
}

export async function removeMember(orgId: string, targetUserId: string): Promise<Result> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const [membership, targetMembership] = await Promise.all([
      db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } }),
      db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId: targetUserId } } }),
    ]);

    if (!membership) return err("Not a member of this org");
    if (!targetMembership) return err("Target user is not a member");
    if (!canRemoveMember({ orgId, role: membership.role }, targetUserId, userId)) return err("Permission denied");

    if (targetMembership.role === Role.OWNER) {
      const ownerCount = await db.orgMember.count({ where: { orgId, role: Role.OWNER } });
      if (ownerCount === 1) return err("Cannot remove the last owner of an org");
    }

    await db.orgMember.delete({ where: { orgId_userId: { orgId, userId: targetUserId } } });
    await writeAuditLog({ action: "org.member_remove", userId, orgId, resourceId: targetUserId, resourceType: "user" });
    revalidatePath("/orgs");
    return ok({});
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to remove member");
  }
}

export async function leaveOrg(orgId: string): Promise<Result> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const membership = await db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
    if (!membership) return err("Not a member of this org");

    if (membership.role === Role.OWNER) {
      const ownerCount = await db.orgMember.count({ where: { orgId, role: Role.OWNER } });
      if (ownerCount === 1) return err("You are the last owner. Transfer ownership or delete the org before leaving.");
    }

    await db.orgMember.delete({ where: { orgId_userId: { orgId, userId } } });
    await writeAuditLog({ action: "org.member_remove", userId, orgId, resourceId: userId, resourceType: "user", metadata: { self: true } });
    revalidatePath("/dashboard");
    return ok({});
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to leave org");
  }
}

export async function deleteOrg(orgId: string): Promise<Result> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const membership = await db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
    if (!membership || membership.role !== Role.OWNER) return err("Only owners can delete an org");

    await db.org.delete({ where: { id: orgId } });
    await writeAuditLog({ action: "org.delete", userId, orgId, resourceType: "org", metadata: { deleted: true } });
    revalidatePath("/dashboard");
    return ok({});
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to delete org");
  }
}

export async function denyInvite(inviteId: string): Promise<Result> {
  try {
    const session = await getSession();
    const userEmail = session.user.email;

    const invite = await db.orgInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return err("Invite not found");
    if (invite.email !== userEmail) return err("Not your invite");

    await db.orgInvite.delete({ where: { id: inviteId } });
    revalidatePath("/invites");
    return ok({});
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to decline invite");
  }
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
