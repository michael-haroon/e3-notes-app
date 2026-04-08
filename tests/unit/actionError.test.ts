import { describe, expect, it } from "vitest";
import { getActionError } from "@/lib/action-error";

describe("getActionError", () => {
  it("returns fallback for non-Error values", () => {
    expect(getActionError("nope", "Fallback")).toBe("Fallback");
  });

  it("unwraps APP_ERROR messages", () => {
    expect(getActionError(new Error("APP_ERROR:Readable failure"))).toBe("Readable failure");
  });

  it("returns fallback for production digest errors", () => {
    expect(getActionError(new Error("A Server Components render error with digest 123"), "Fallback")).toBe("Fallback");
  });

  it("returns the original message for normal errors", () => {
    expect(getActionError(new Error("Network failed"), "Fallback")).toBe("Network failed");
  });
});
