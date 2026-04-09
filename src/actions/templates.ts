"use server";

function appError(message: string): Error {
  return new Error(`APP_ERROR:${message}`);
}

import { getSessionWithOrg } from "@/lib/session";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getSession() {
  const s = await getSessionWithOrg();
  return { user: s.user, orgId: s.activeOrgId, role: s.activeOrgRole };
}

const templateSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().default(""),
});

export async function createTemplate(input: z.infer<typeof templateSchema>) {
  const { user, orgId } = await getSession();
  const data = templateSchema.parse(input);

  const template = await db.noteTemplate.create({
    data: {
      title: data.title,
      content: data.content,
      orgId,
      createdBy: user.id,
    },
  });

  await writeAuditLog({
    action: "template.create",
    userId: user.id,
    orgId,
    resourceId: template.id,
    resourceType: "template",
  });

  revalidatePath("/templates");
  return { success: true, templateId: template.id };
}

export async function updateTemplate(templateId: string, input: z.infer<typeof templateSchema>) {
  const { orgId } = await getSession();
  const data = templateSchema.parse(input);

  const template = await db.noteTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw appError("Template not found");
  if (template.orgId !== orgId) throw appError("Template not found");

  await db.noteTemplate.update({
    where: { id: templateId },
    data: { title: data.title, content: data.content },
  });

  revalidatePath("/templates");
  return { success: true };
}

export async function deleteTemplate(templateId: string) {
  const { user, orgId } = await getSession();

  const template = await db.noteTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw appError("Template not found");
  if (template.orgId !== orgId) throw appError("Template not found");

  await db.noteTemplate.delete({ where: { id: templateId } });

  await writeAuditLog({
    action: "template.delete",
    userId: user.id,
    orgId,
    resourceId: templateId,
    resourceType: "template",
    metadata: { title: template.title },
  });

  revalidatePath("/templates");
  return { success: true };
}

export async function getTemplates() {
  const { orgId } = await getSession();

  return db.noteTemplate.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });
}
