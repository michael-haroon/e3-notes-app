import { expect, test } from "@playwright/test";
import { SEEDED_E2E_USER, createNote, createOrg, signIn } from "./helpers";

test.describe("Note workflows", () => {
  test("requires a title before creating a note", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Validation Org ${Date.now()}`);

    await page.getByRole("link", { name: "New Note" }).first().click();
    await page.getByRole("button", { name: "Create note" }).click();

    await expect(page).toHaveURL(/\/notes\/new$/);
    const titleIsInvalid = await page.getByPlaceholder("Note title").evaluate((element) => {
      return !(element as HTMLInputElement).checkValidity();
    });
    expect(titleIsInvalid).toBe(true);
  });

  test("creates a private note and shows the private badge", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Private Org ${Date.now()}`);

    const noteTitle = `Private Note ${Date.now()}`;
    await createNote(page, { title: noteTitle, content: "Only for me", visibility: "Private" });

    await expect(page.getByRole("heading", { name: noteTitle })).toBeVisible();
    await expect(page.getByTestId("note-detail-visibility")).toHaveText("Private");
    await expect(page.getByRole("heading", { name: "Shared with" })).toBeVisible();
  });

  test("dashboard search finds a newly created note and reset view clears the empty state", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);
    await createOrg(page, `Search Org ${Date.now()}`);

    const noteTitle = `Roadmap ${Date.now()}`;
    await createNote(page, {
      title: noteTitle,
      content: "Release planning, launch checklist, and migration notes.",
    });

    await page.goto("/dashboard");
    await page.reload();
    const input = page.getByPlaceholder(/Search by title, content, tag, or author/);
    await input.fill("launch checklist");

    await expect(page.getByTestId("note-card")).toContainText(noteTitle, { timeout: 10_000 });
    await expect(page.getByText(/1 of 1 note/)).toBeVisible();

    await input.fill("definitely-no-match-here");
    await expect(page.getByText("No notes match these filters")).toBeVisible();

    await page.getByRole("button", { name: "Reset view" }).click();
    await expect.poll(() => input.inputValue()).toBe("");
    await expect(page.getByTestId("note-card").first()).toBeVisible();
    await expect(page.getByText(/1 of 1 note/)).toBeVisible();
  });
});
