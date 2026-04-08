import { expect, test } from "@playwright/test";
import { SEEDED_E2E_USER, createOrg, signIn } from "./helpers";

test.describe("App shell", () => {
  test("switches between orgs from the workspace dropdown", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);

    const firstOrg = `Alpha Org ${Date.now()}`;
    const secondOrg = `Beta Org ${Date.now()}`;

    await createOrg(page, firstOrg);
    await createOrg(page, secondOrg);

    const workspaceSelect = page.locator("#workspace-switcher");
    await expect(workspaceSelect).toHaveValue(/.+/);
    await expect(page.getByRole("heading", { name: secondOrg })).toBeVisible();

    await workspaceSelect.selectOption({ label: firstOrg });
    await expect(page.getByText("Switching workspace…")).toBeVisible();
    await expect(page.getByRole("heading", { name: firstOrg })).toBeVisible({ timeout: 10_000 });

    await workspaceSelect.selectOption({ label: secondOrg });
    await expect(page.getByRole("heading", { name: secondOrg })).toBeVisible({ timeout: 10_000 });
  });

  test("app shell stays in light mode after reload", async ({ page }) => {
    await signIn(page, SEEDED_E2E_USER);

    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Toggle dark mode" })).toHaveCount(0);
  });
});
