import { expect, test } from "@playwright/test";
import { SEEDED_E2E_USER, createNote, createOrg, signIn } from "./helpers";

test.describe("Note workflows", () => {
  test("requires a title before creating a note", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Validation Org ${Date.now()}`);

    await page.getByRole("link", { name: "New Note" }).first().click();
    await page.getByRole("button", { name: "Create note" }).click();

    await expect(page.getByText("Title is required.")).toBeVisible();
    await expect(page).toHaveURL(/\/notes\/new$/);
  });

  test("creates a private note and shows the private badge", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Private Org ${Date.now()}`);

    const noteTitle = `Private Note ${Date.now()}`;
    await createNote(page, { title: noteTitle, content: "Only for me", visibility: "Private" });

    await expect(page.getByRole("heading", { name: noteTitle })).toBeVisible();
    await expect(page.getByText("Private").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shared with" })).toBeVisible();
  });

  test("search finds a newly created note and clears empty state", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Search Org ${Date.now()}`);

    const noteTitle = `Roadmap ${Date.now()}`;
    await createNote(page, {
      title: noteTitle,
      content: "Release planning, launch checklist, and migration notes.",
    });

    await page.goto("/search");
    const input = page.getByPlaceholder(/Search notes/);
    await input.fill("launch checklist");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByRole("link", { name: new RegExp(noteTitle) })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/1 of 1 result/)).toBeVisible();

    await input.press("Escape");
    await expect(page.getByText(/No results found/)).not.toBeVisible();
  });
});
