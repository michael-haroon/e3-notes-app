"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COOKIE = "tn_active_org";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

/** Switch the active org. Called from AppShell's org switcher. */
export async function switchActiveOrg(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, orgId, COOKIE_OPTS);
  revalidatePath("/dashboard");
}

/** Clear the active org cookie (used after leaving/deleting an org). */
export async function clearActiveOrg() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
  revalidatePath("/dashboard");
}
