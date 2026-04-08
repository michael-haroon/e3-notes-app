import { expect, test } from "@playwright/test";
import { SEEDED_E2E_USER, signIn, signOut } from "./helpers";

test.describe("Authentication", () => {
  test("login page renders the branded sign-in shell", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("TeamNotes")).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /password/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Continue$/ })).toBeVisible();
  });

  test("register page renders the branded sign-up shell", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByText("TeamNotes")).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /password/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Continue$/ })).toBeVisible();
  });

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login**", { timeout: 5_000 });
    expect(page.url()).toContain("/login");
  });

  test("signed-in users are redirected away from auth routes", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);

    await page.goto("/login");
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/register");
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
  });

  test("seeded user can sign in and sign out", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await expect(page.getByRole("heading", { name: "Acme Corp" })).toBeVisible();

    await signOut(page);
    await expect(page.url()).toContain("/login");
  });
});
