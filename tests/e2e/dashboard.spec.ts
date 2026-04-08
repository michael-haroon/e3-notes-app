import { test, expect } from "@playwright/test";
import { TEST_USER, TEST_ORG_NAME, registerUser, signIn } from "./helpers";

test.describe("Dashboard & Notes", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, TEST_USER);
    await signIn(page, TEST_USER);
  });

  test("shows no-org state for new user with no orgs", async ({ page }) => {
    // A freshly registered user with a unique email will have no org
    const freshEmail = `e2e-fresh-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByPlaceholder("you@example.com").fill(freshEmail);
    await page.getByPlaceholder("At least 8 characters").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "No organization yet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create organization" })).toBeVisible();
  });

  test("sidebar is visible after login", async ({ page }) => {
    await expect(page.getByText("TeamNotes")).toBeVisible();
    await expect(page.getByRole("link", { name: "Notes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Search" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Invites" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Org Settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("create new org", async ({ page }) => {
    const orgName = `Test Org ${Date.now()}`;

    // Go to create org page (no org yet, or via link)
    await page.goto("/orgs/new");
    await expect(page.getByRole("heading", { name: "Create Organization" })).toBeVisible();
    await page.getByPlaceholder("Acme Inc").fill(orgName);
    await page.getByRole("button", { name: "Create organization" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    // Org name should appear in dashboard
    await expect(page.getByRole("heading", { name: orgName })).toBeVisible();
  });

  test("create and view a note", async ({ page }) => {
    // Ensure user has an org
    const orgName = `Notes Org ${Date.now()}`;
    await page.goto("/orgs/new");
    await page.getByPlaceholder("Acme Inc").fill(orgName);
    await page.getByRole("button", { name: "Create organization" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    // Create a note
    await page.getByRole("link", { name: "New Note" }).first().click();
    await page.waitForURL("**/notes/new", { timeout: 5_000 });

    const noteTitle = `My E2E Note ${Date.now()}`;
    await page.getByPlaceholder("Note title").fill(noteTitle);
    await page.getByPlaceholder("Write your note here…").fill("This is the note content.");
    await page.getByRole("button", { name: "Create note" }).click();
    await page.waitForURL("**/notes/**", { timeout: 10_000 });

    // Should show the note title as a heading
    await expect(page.getByRole("heading", { name: noteTitle })).toBeVisible();
    await expect(page.getByText("This is the note content.")).toBeVisible();
  });

  test("note shows edit and delete buttons for author", async ({ page }) => {
    // Create an org and note
    const orgName = `Author Org ${Date.now()}`;
    await page.goto("/orgs/new");
    await page.getByPlaceholder("Acme Inc").fill(orgName);
    await page.getByRole("button", { name: "Create organization" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.getByRole("link", { name: "New Note" }).first().click();
    await page.getByPlaceholder("Note title").fill("Author Test Note");
    await page.getByRole("button", { name: "Create note" }).click();
    await page.waitForURL("**/notes/**", { timeout: 10_000 });

    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(page.getByRole("link", { name: "History" })).toBeVisible();
  });

  test("edit note updates content", async ({ page }) => {
    const orgName = `Edit Org ${Date.now()}`;
    await page.goto("/orgs/new");
    await page.getByPlaceholder("Acme Inc").fill(orgName);
    await page.getByRole("button", { name: "Create organization" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.getByRole("link", { name: "New Note" }).first().click();
    await page.getByPlaceholder("Note title").fill("Original Title");
    await page.getByPlaceholder("Write your note here…").fill("Original content");
    await page.getByRole("button", { name: "Create note" }).click();
    await page.waitForURL("**/notes/**", { timeout: 10_000 });

    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL("**/edit", { timeout: 5_000 });

    await page.getByPlaceholder("Note title").clear();
    await page.getByPlaceholder("Note title").fill("Updated Title");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(/\/notes\/[^/]+$/, { timeout: 10_000 });

    await expect(page.getByRole("heading", { name: "Updated Title" })).toBeVisible();
  });

  test("search page is accessible and functional", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expect(page.getByPlaceholder(/Search notes/)).toBeVisible();
  });
});
