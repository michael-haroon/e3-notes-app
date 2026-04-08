import { describe, it, expect } from "vitest";
import { Role } from "../../src/generated/prisma/enums";
import { canCallerRemove } from "@/lib/org-settings";

describe("canCallerRemove", () => {
  const CALLER = "caller-id";
  const TARGET = "target-id";

  it("OWNER can remove a MEMBER", () => {
    expect(canCallerRemove(Role.OWNER, CALLER, TARGET, Role.MEMBER)).toBe(true);
  });

  it("OWNER can remove an ADMIN", () => {
    expect(canCallerRemove(Role.OWNER, CALLER, TARGET, Role.ADMIN)).toBe(true);
  });

  it("OWNER can remove another OWNER", () => {
    expect(canCallerRemove(Role.OWNER, CALLER, TARGET, Role.OWNER)).toBe(true);
  });

  it("OWNER cannot remove themselves", () => {
    expect(canCallerRemove(Role.OWNER, CALLER, CALLER, Role.OWNER)).toBe(false);
  });

  it("ADMIN can remove a MEMBER", () => {
    expect(canCallerRemove(Role.ADMIN, CALLER, TARGET, Role.MEMBER)).toBe(true);
  });

  it("ADMIN cannot remove another ADMIN", () => {
    expect(canCallerRemove(Role.ADMIN, CALLER, TARGET, Role.ADMIN)).toBe(false);
  });

  it("ADMIN cannot remove an OWNER", () => {
    expect(canCallerRemove(Role.ADMIN, CALLER, TARGET, Role.OWNER)).toBe(false);
  });

  it("ADMIN cannot remove themselves", () => {
    expect(canCallerRemove(Role.ADMIN, CALLER, CALLER, Role.ADMIN)).toBe(false);
  });

  it("MEMBER cannot remove anyone", () => {
    expect(canCallerRemove(Role.MEMBER, CALLER, TARGET, Role.MEMBER)).toBe(false);
    expect(canCallerRemove(Role.MEMBER, CALLER, TARGET, Role.ADMIN)).toBe(false);
    expect(canCallerRemove(Role.MEMBER, CALLER, TARGET, Role.OWNER)).toBe(false);
  });
});
