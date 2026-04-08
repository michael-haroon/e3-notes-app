"use server";

import { getSessionWithOrg } from "@/lib/session";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { Role } from "@/generated/prisma/enums";
import { isAtLeast } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function createTag(name: string) {
  const { user, activeOrgId: orgId } = await getSessionWithOrg();

  const tag = await db.tag.upsert({
    where: { orgId_name: { orgId, name: name.toLowerCase().trim() } },
    create: { name: name.toLowerCase().trim(), orgId },
    update: {},
  });

  await writeAuditLog({
    action: "tag.create",
    userId: user.id,
    orgId,
    resourceId: tag.id,
    resourceType: "tag",
    metadata: { name: tag.name },
  });

  revalidatePath("/dashboard");
  return tag;
}

export async function deleteTag(tagId: string) {
  const { user, activeOrgId: orgId, activeOrgRole: role } = await getSessionWithOrg();

  if (!isAtLeast(role, Role.ADMIN)) {
    throw new Error("Permission denied: must be ADMIN or OWNER to delete tags");
  }

  const tag = await db.tag.findFirst({ where: { id: tagId, orgId } });
  if (!tag) throw new Error("Tag not found in this org");

  await db.tag.delete({ where: { id: tagId } });

  await writeAuditLog({
    action: "tag.delete",
    userId: user.id,
    orgId,
    resourceId: tagId,
    resourceType: "tag",
    metadata: { name: tag.name },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getOrgTags() {
  const { activeOrgId: orgId } = await getSessionWithOrg();
  return db.tag.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });
}
