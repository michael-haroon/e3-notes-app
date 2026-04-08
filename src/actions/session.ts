"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { shouldUseSecureCookies } from "@/lib/session-cookie";

const COOKIE = "tn_active_org";

const appUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
const useSecureCookies = shouldUseSecureCookies(appUrl, process.env.NODE_ENV);

const COOKIE_OPTS = {
  httpOnly: true,
  secure: useSecureCookies,
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
