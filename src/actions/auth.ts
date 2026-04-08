"use server";

/**
 * Auth server actions — kept for audit logging and legacy register API route.
 * Authentication itself is handled by Clerk (login/register pages use Clerk hooks).
 */

import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { headers } from "next/headers";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).max(100).optional(),
});

/**
 * Legacy register — called from the API route for backward compatibility.
 * Creates a DB user without clerkId; Clerk links it on first login via email match.
 */
export async function registerUser(input: z.infer<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? undefined;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email already in use");

  let passwordHash: string | null = null;
  if (data.password) {
    const bcrypt = await import("bcryptjs");
    passwordHash = await bcrypt.hash(data.password, 12);
  }

  const user = await db.user.create({
    data: { email: data.email, name: data.name ?? null, passwordHash },
  });

  await writeAuditLog({
    action: "auth.register",
    userId: user.id,
    ipAddress: ip,
    metadata: { email: data.email },
  });

  return { success: true, userId: user.id };
}

/**
 * Called (optionally) after Clerk creates a user to eagerly sync them into our DB.
 * Not required — getSession() will also sync on first login.
 */
export async function syncClerkUser(input: {
  clerkId: string;
  email: string;
  name?: string | null;
}) {
  const user = await db.user.upsert({
    where: { email: input.email },
    create: { email: input.email, name: input.name ?? null, clerkId: input.clerkId },
    update: { clerkId: input.clerkId },
  });
  return { success: true, userId: user.id };
}
