import { describe, expect, it } from "vitest";
import { shouldUseSecureCookies } from "@/lib/session-cookie";

describe("shouldUseSecureCookies", () => {
  it("uses secure cookies for production https URLs", () => {
    expect(shouldUseSecureCookies("https://app.example.com", "production")).toBe(true);
  });

  it("does not use secure cookies for production localhost over http", () => {
    expect(shouldUseSecureCookies("http://localhost:3000", "production")).toBe(false);
  });

  it("does not use secure cookies outside production", () => {
    expect(shouldUseSecureCookies("https://app.example.com", "development")).toBe(false);
  });

  it("does not use secure cookies when the app URL is missing", () => {
    expect(shouldUseSecureCookies("", "production")).toBe(false);
  });
});
