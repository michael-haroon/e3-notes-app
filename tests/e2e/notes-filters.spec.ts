import { expect, test } from "@playwright/test";
import { SEEDED_E2E_USER, signIn } from "./helpers";

test.describe("Notes filters", () => {
  test("persists search, author, visibility, and sort selections in the URL", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);

    await expect(page.getByRole("heading", { name: "Acme Corp" })).toBeVisible();

    await page.getByPlaceholder(/Search by title, content, tag, or author/).fill("dark mode");
    await page.getByLabel("Author").selectOption({ label: "User 2" });
    await page.getByLabel("Sort").selectOption("title-asc");

    await expect.poll(() => page.url()).toContain("/dashboard?q=dark+mode");
    await expect.poll(() => page.url()).toContain("sort=title-asc");

    await page.reload();

    await expect(page.getByPlaceholder(/Search by title, content, tag, or author/)).toHaveValue("dark mode");
    await expect(page.getByLabel("Author")).toHaveValue(/.+/);
    await expect(page.locator("#notes-author-filter option:checked")).toHaveText("User 2");
    await expect(page.getByLabel("Sort")).toHaveValue("title-asc");
  });

  test("filters seeded notes by author and visibility, then clears the view", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);

    const seededFilterTarget = await page.getByTestId("note-card").evaluateAll((elements) => {
      return elements
        .map((element) => ({
          author: element.getAttribute("data-note-author"),
          visibility: element.getAttribute("data-note-visibility"),
        }))
        .find((item) => item.author && item.author !== "You" && item.visibility);
    });

    expect(seededFilterTarget?.author).toBeTruthy();
    expect(seededFilterTarget?.visibility).toBeTruthy();

    await page.getByLabel("Author").selectOption({ label: seededFilterTarget!.author! });
    await page.getByRole("button", { name: seededFilterTarget!.visibility! }).click();

    const cards = page.getByTestId("note-card");
    await expect(cards.first()).toBeVisible();

    const authors = await page.getByTestId("note-author").allTextContents();
    const visibilities = await page.getByTestId("note-visibility").allTextContents();
    const expectedVisibilityLabel =
      seededFilterTarget!.visibility!.charAt(0) + seededFilterTarget!.visibility!.slice(1).toLowerCase();

    expect(authors.length).toBeGreaterThan(0);
    expect(new Set(authors)).toEqual(new Set([seededFilterTarget!.author!]));
    expect(new Set(visibilities)).toEqual(new Set([expectedVisibilityLabel]));

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByLabel("Author")).toHaveValue("");
    await expect(page.getByRole("button", { name: "All" })).toHaveClass(/bg-\[var\(--accent-soft\)\]/);
    await expect(page.getByTestId("note-card").first()).toBeVisible();
  });
});
