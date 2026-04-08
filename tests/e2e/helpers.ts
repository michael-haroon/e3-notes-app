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

/** Register a new user via the UI. Fails gracefully if already exists. */
export async function registerUser(
  page: Page,
  user: { email: string; password: string; name: string }
) {
  await page.goto("/register");
  await page.getByPlaceholder("Your name").fill(user.name);
  await page.getByPlaceholder("you@example.com").fill(user.email);
  await page.getByPlaceholder("At least 8 characters").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  // either lands on /dashboard (new) or shows "already in use" (existing)
  await page.waitForTimeout(1000);
}

/** Sign in via the login page and wait for dashboard. */
export async function signIn(
  page: Page,
  user: { email: string; password: string }
) {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(user.email);
  await page.getByPlaceholder("••••••••").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

/** Sign out via the sidebar button. */
export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login", { timeout: 5_000 });
}
