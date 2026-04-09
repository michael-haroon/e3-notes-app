import { expect, test } from "@playwright/test";
import { SEEDED_E2E_USER, createNote, createOrg, signIn } from "./helpers";

test.describe("Pin notes", () => {
  test("can pin and unpin a note from the detail page", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Pin Org ${Date.now()}`);

    const noteTitle = `Pinnable ${Date.now()}`;
    await createNote(page, { title: noteTitle });

    // Pin the note
    await page.getByRole("button", { name: /^Pin$/ }).click();
    await expect(page.getByRole("button", { name: /Pinned/ })).toBeVisible({ timeout: 5_000 });

    // Unpin the note
    await page.getByRole("button", { name: /Pinned/ }).click();
    await expect(page.getByRole("button", { name: /^Pin$/ })).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Note comments", () => {
  test("can post and see a comment on a note", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Comment Org ${Date.now()}`);

    await createNote(page, { title: `Commented Note ${Date.now()}` });

    const commentText = `Test comment ${Date.now()}`;
    await page.getByPlaceholder("Add a comment…").fill(commentText);
    await page.getByRole("button", { name: "Post comment" }).click();

    await expect(page.getByText(commentText)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Templates", () => {
  test("can create a template and use it when creating a note", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Templates Org ${Date.now()}`);

    // Create a template
    await page.goto("/templates/new");
    await page.waitForURL("**/templates/new", { timeout: 5_000 });

    const templateTitle = `Meeting Notes ${Date.now()}`;
    await page.getByPlaceholder("Template title (e.g. Meeting Notes, Bug Report)").fill(templateTitle);
    await page.getByPlaceholder(/Optional default content/).fill("## Agenda\n\n## Action Items");
    await page.getByRole("button", { name: "Create template" }).click();

    await page.waitForURL("**/templates", { timeout: 8_000 });
    await expect(page.getByText(templateTitle)).toBeVisible();

    // Use the template when creating a note
    await page.goto("/notes/new");
    await page.getByRole("button", { name: "Use Template" }).click();
    await page.getByText(templateTitle).click();

    await expect(page.getByPlaceholder("Note title")).toHaveValue(templateTitle);
    await expect(page.getByPlaceholder("Write your note here…")).toContainText("Agenda");
  });
});

test.describe("Export note", () => {
  test("export button triggers a download", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Export Org ${Date.now()}`);

    const noteTitle = `Exportable ${Date.now()}`;
    await createNote(page, { title: noteTitle, content: "Some content to export" });

    // Intercept the download
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });
});

test.describe("Bulk delete", () => {
  test("select mode activates and shows selection toolbar", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Bulk Org ${Date.now()}`);

    // Create a note so the dashboard isn't empty
    await createNote(page, { title: `Bulk Note ${Date.now()}` });
    await page.goto("/dashboard");
    await page.reload();

    // Enter selection mode
    await page.getByRole("button", { name: "Select" }).click();
    await expect(page.getByText("0 selected")).toBeVisible();

    // Select all visible notes
    await page.getByRole("button", { name: /Select all/ }).click();

    // At least 1 note should be selected
    const selectedText = await page.getByText(/\d+ selected/).textContent();
    const count = parseInt(selectedText?.match(/\d+/)?.[0] ?? "0");
    expect(count).toBeGreaterThanOrEqual(1);

    // Bulk delete button should be enabled
    await expect(page.getByRole("button", { name: /Delete \(\d+\)/ })).toBeVisible();

    // Cancel selection
    await page.getByRole("button", { name: "Cancel selection" }).click();
    await expect(page.getByRole("button", { name: "Select" })).toBeVisible();
  });
});
