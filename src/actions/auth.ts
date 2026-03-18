"use server";

import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { signIn, signOut } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
});

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? undefined;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email already in use");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await db.user.create({
    data: { email: data.email, name: data.name, passwordHash },
  });

  await writeAuditLog({
    action: "auth.register",
    userId: user.id,
    ipAddress: ip,
    metadata: { email: data.email },
  });

  return { success: true, userId: user.id };
}

export async function loginUser(email: string, password: string) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? undefined;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    await writeAuditLog({
      action: "auth.login",
      ipAddress: ip,
      metadata: { email },
    });
    return { success: true };
  } catch {
    await writeAuditLog({
      action: "auth.login_failed",
      ipAddress: ip,
      metadata: { email },
    });
    throw new Error("Invalid credentials");
  }
}

export async function logoutUser() {
  await signOut({ redirect: false });
  return { success: true };
}
