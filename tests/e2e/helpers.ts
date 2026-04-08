import { Page } from "@playwright/test";

export const TEST_USER = {
  email: "e2e-test@example.com",
  password: "testpassword123",
  name: "E2E Test User",
};

export const TEST_USER_2 = {
  email: "e2e-member@example.com",
  password: "testpassword123",
  name: "E2E Member",
};

export const TEST_ORG_NAME = "E2E Test Org";
export const SEEDED_E2E_USER = {
  email: process.env.E2E_EMAIL ?? "user1@example.com",
  password: process.env.E2E_PASSWORD ?? "password123",
};

export function uniqueUser(prefix = "e2e") {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `${prefix}-${stamp}@example.com`,
    password: "password123",
    name: `${prefix} ${stamp}`,
  };
}

/** Register a new user via the UI. Fails gracefully if already exists. */
export async function registerUser(
  page: Page,
  user: { email: string; password: string; name: string }
) {
  await page.goto("/register");
  await page.getByRole("textbox", { name: /username/i }).fill(user.name);
  await page.getByRole("textbox", { name: /email/i }).fill(user.email);
  await page.getByRole("textbox", { name: /password/i }).fill(user.password);
  await page.getByRole("button", { name: /continue|create account/i }).click();
  // either lands on /dashboard (new) or shows "already in use" (existing)
  await page.waitForTimeout(1000);
}

/** Sign in via the login page and wait for dashboard. */
export async function signIn(
  page: Page,
  user: { email: string; password: string }
) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill(user.email);
  await page.getByRole("textbox", { name: /password/i }).fill(user.password);
  await page.getByRole("button", { name: /^Continue$/ }).click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

/** Sign out via the sidebar button. */
export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login", { timeout: 5_000 });
}

export async function createOrg(page: Page, orgName: string) {
  await page.goto("/orgs/new");
  await page.getByPlaceholder("Acme Inc").fill(orgName);
  await page.getByRole("button", { name: "Create organization" }).click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

export async function createNote(
  page: Page,
  { title, content = "", visibility = "Org" }: { title: string; content?: string; visibility?: "Org" | "Private" }
) {
  await page.getByRole("link", { name: "New Note" }).first().click();
  await page.waitForURL("**/notes/new", { timeout: 5_000 });
  await page.getByPlaceholder("Note title").fill(title);
  if (content) {
    await page.getByPlaceholder("Write your note here…").fill(content);
  }
  if (visibility === "Private") {
    await page.getByRole("button", { name: /Private/i }).click();
  }
  await page.getByRole("button", { name: "Create note" }).click();
  await page.waitForURL("**/notes/**", { timeout: 10_000 });
}
