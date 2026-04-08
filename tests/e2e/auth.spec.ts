import { test, expect } from "@playwright/test";
import { TEST_USER, registerUser, signIn, signOut } from "./helpers";

test.describe("Authentication", () => {
  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("At least 8 characters")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    // Link to login
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create one" })).toBeVisible();
  });

  test("shows password strength hint while typing", async ({ page }) => {
    await page.goto("/register");
    await page.getByPlaceholder("At least 8 characters").fill("abc");
    await expect(page.getByText(/more character/)).toBeVisible();
    await page.getByPlaceholder("At least 8 characters").fill("abcdefgh");
    await expect(page.getByText(/more character/)).not.toBeVisible();
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill("nobody@example.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login**", { timeout: 5_000 });
    expect(page.url()).toContain("/login");
  });

  test("register new user, then sign out and sign back in", async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByPlaceholder("Your name").fill("Temp User");
    await page.getByPlaceholder("you@example.com").fill(uniqueEmail);
    await page.getByPlaceholder("At least 8 characters").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    // Sign out
    await signOut(page);
    expect(page.url()).toContain("/login");

    // Sign back in
    await signIn(page, { email: uniqueEmail, password: "password123" });
    expect(page.url()).toContain("/dashboard");
  });

  test("register with existing email shows error", async ({ page }) => {
    // First ensure TEST_USER exists
    await registerUser(page, TEST_USER);

    // Try to register again with same email
    await page.goto("/register");
    await page.getByPlaceholder("you@example.com").fill(TEST_USER.email);
    await page.getByPlaceholder("At least 8 characters").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Email already in use")).toBeVisible({ timeout: 5_000 });
  });
});
