import { defineConfig, devices } from "@playwright/test";

const useExistingServerOnly = process.env.PLAYWRIGHT_USE_EXISTING_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // tests share db state, run sequentially
  retries: 0,
  workers: 1,
  reporter: "list",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start dev server automatically if not already running.
  // When Docker or another local instance is already serving the app,
  // PLAYWRIGHT_USE_EXISTING_SERVER=1 skips spawning a second server.
  webServer: useExistingServerOnly
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
