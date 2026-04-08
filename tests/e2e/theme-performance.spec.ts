import { expect, test } from "@playwright/test";

test.describe("Theme performance", () => {
  test("theme toggle flips the dark class quickly on the login page", async ({ page }) => {
    await page.goto("/login");

    const toggle = page.getByRole("button", { name: "Toggle dark mode" });
    const before = await page.locator("html").evaluate((element) => element.classList.contains("dark"));

    await toggle.click();

    const elapsed = await page.evaluate(async (expectedDark) => {
      const start = performance.now();

      return await new Promise<number>((resolve) => {
        const frame = () => {
          const isDark = document.documentElement.classList.contains("dark");
          if (isDark === expectedDark) {
            resolve(performance.now() - start);
            return;
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    }, !before);

    await expect
      .poll(async () => page.locator("html").evaluate((element) => element.classList.contains("dark")))
      .toBe(!before);

    expect(elapsed).toBeLessThan(250);
  });
});
