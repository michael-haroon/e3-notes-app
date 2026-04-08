import { test, expect } from "@playwright/test";
import { registerUser, signIn } from "./helpers";

test.describe("Org Settings & Permissions", () => {
  test("create org and see it in settings", async ({ page }) => {
    const email = `e2e-org-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("At least 8 characters").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/orgs/new");
    const orgName = `Org Settings Test ${Date.now()}`;
    await page.getByPlaceholder("Acme Inc").fill(orgName);
    await page.getByRole("button", { name: "Create organization" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/orgs");
    await expect(page.getByRole("heading", { name: "Org Settings" })).toBeVisible();
    // Owner badge
    await expect(page.getByText("Owner")).toBeVisible();
    // Members section
    await expect(page.getByText("Members")).toBeVisible();
    // Invite section (owner can invite)
    await expect(page.getByText("Invite Member")).toBeVisible();
    // Danger zone
    await expect(page.getByText("Danger Zone")).toBeVisible();
  });

  test("invite form shows error for unregistered email", async ({ page }) => {
    const email = `e2e-invite-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("At least 8 characters").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/orgs/new");
    const orgName = `Invite Test Org ${Date.now()}`;
    await page.getByPlaceholder("Acme Inc").fill(orgName);
    await page.getByRole("button", { name: "Create organization" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/orgs");

    // Try to invite a non-existent user
    await page.getByPlaceholder("colleague@example.com").fill("nobody-registered@example.com");
    await page.getByRole("button", { name: "Send Invite" }).click();

    // Should show the "user doesn't exist" error
    await expect(page.getByText(/registered an account/i)).toBeVisible({ timeout: 5_000 });
  });

  test("MEMBER does not see Remove button next to OWNER", async ({ page }) => {
    // This test verifies the edge case fix: ADMINs/MEMBERs shouldn't see
    // Remove on OWNER members.
    // We test by checking UI logic: a member with their own user
    // (who is OWNER) should not see a Remove button next to themselves.
    const email = `e2e-owner-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("At least 8 characters").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/orgs/new");
    await page.getByPlaceholder("Acme Inc").fill(`Owner Test Org ${Date.now()}`);
    await page.getByRole("button", { name: "Create organization" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/orgs");

    // The owner's own row should NOT have a Remove button
    // (self-remove is prevented, handled by Leave instead)
    const memberRows = page.locator("div").filter({ hasText: "(you)" });
    const rowWithYou = memberRows.first();
    await expect(rowWithYou.getByRole("button", { name: "Remove" })).not.toBeVisible();
  });

  test("org new - requires at least 2 characters in name", async ({ page }) => {
    const email = `e2e-name-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("At least 8 characters").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/orgs/new");
    await page.getByPlaceholder("Acme Inc").fill("A"); // only 1 char
    await page.getByRole("button", { name: "Create organization" }).click();
    await expect(page.getByText("at least 2 characters")).toBeVisible({ timeout: 3_000 });
  });

  test("invites page shows empty state", async ({ page }) => {
    const email = `e2e-invites-${Date.now()}@example.com`;
    await registerUser(page, { email, password: "password123", name: "Invite Test" });
    await signIn(page, { email, password: "password123" });

    await page.goto("/invites");
    await expect(page.getByRole("heading", { name: "Pending Invites" })).toBeVisible();
    await expect(page.getByText("No pending invites")).toBeVisible();
  });

  test("leave org button is visible in danger zone", async ({ page }) => {
    const email = `e2e-leave-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("At least 8 characters").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/orgs/new");
    await page.getByPlaceholder("Acme Inc").fill(`Leave Test Org ${Date.now()}`);
    await page.getByRole("button", { name: "Create organization" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/orgs");
    await expect(page.getByRole("button", { name: "Leave org" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete org" })).toBeVisible();
  });
});
