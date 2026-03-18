import { describe, it, expect } from "vitest";
import {
  canReadNote,
  canWriteNote,
  canDeleteNote,
  canReadFile,
  canInviteMembers,
  canChangeRole,
  isAtLeast,
} from "@/lib/permissions";
import { Role, Visibility } from "@/generated/prisma";

const makeUser = (id: string) => ({ id, email: `${id}@example.com` });
const makeOrg = (orgId: string, role: Role) => ({ orgId, role });
const makeNote = (authorId: string, visibility: Visibility, orgId = "org1") => ({
  authorId,
  visibility,
  orgId,
});

describe("isAtLeast", () => {
  it("MEMBER >= MEMBER", () => expect(isAtLeast(Role.MEMBER, Role.MEMBER)).toBe(true));
  it("ADMIN >= MEMBER", () => expect(isAtLeast(Role.ADMIN, Role.MEMBER)).toBe(true));
  it("OWNER >= ADMIN", () => expect(isAtLeast(Role.OWNER, Role.ADMIN)).toBe(true));
  it("MEMBER < ADMIN", () => expect(isAtLeast(Role.MEMBER, Role.ADMIN)).toBe(false));
  it("ADMIN < OWNER", () => expect(isAtLeast(Role.ADMIN, Role.OWNER)).toBe(false));
});

describe("canReadNote", () => {
  const user = makeUser("u1");
  const otherUser = makeUser("u2");
  const org = makeOrg("org1", Role.MEMBER);

  describe("PUBLIC notes", () => {
    const note = makeNote("u2", Visibility.PUBLIC);
    it("org member can read PUBLIC note", () => {
      expect(canReadNote(user, org, note)).toBe(true);
    });
    it("author can read their PUBLIC note", () => {
      expect(canReadNote(otherUser, org, note)).toBe(true);
    });
  });

  describe("ORG notes", () => {
    const note = makeNote("u2", Visibility.ORG);
    it("org member can read ORG note", () => {
      expect(canReadNote(user, org, note)).toBe(true);
    });
    it("user from different org cannot read ORG note", () => {
      const wrongOrg = makeOrg("org2", Role.MEMBER);
      expect(canReadNote(user, wrongOrg, note)).toBe(false);
    });
  });

  describe("PRIVATE notes", () => {
    const note = makeNote("u2", Visibility.PRIVATE);
    it("author can read their own PRIVATE note", () => {
      expect(canReadNote(otherUser, makeOrg("org1", Role.MEMBER), note)).toBe(true);
    });
    it("other member CANNOT read PRIVATE note", () => {
      expect(canReadNote(user, org, note)).toBe(false);
    });
    it("member with NoteShare CAN read PRIVATE note", () => {
      expect(canReadNote(user, org, note, [{ userId: "u1" }])).toBe(true);
    });
    it("ADMIN cannot read PRIVATE note without share", () => {
      const adminOrg = makeOrg("org1", Role.ADMIN);
      expect(canReadNote(user, adminOrg, note)).toBe(false);
    });
    it("OWNER cannot read PRIVATE note without share", () => {
      const ownerOrg = makeOrg("org1", Role.OWNER);
      expect(canReadNote(user, ownerOrg, note)).toBe(false);
    });
    it("wrong org member with share cannot read PRIVATE note", () => {
      const wrongOrg = makeOrg("org2", Role.MEMBER);
      expect(canReadNote(user, wrongOrg, note, [{ userId: "u1" }])).toBe(false);
    });
  });
});

describe("canWriteNote", () => {
  const author = makeUser("u1");
  const otherUser = makeUser("u2");
  const org = makeOrg("org1", Role.MEMBER);

  it("author can write their own note", () => {
    const note = makeNote("u1", Visibility.ORG);
    expect(canWriteNote(author, org, note)).toBe(true);
  });

  it("MEMBER cannot write another user's note", () => {
    const note = makeNote("u1", Visibility.ORG);
    expect(canWriteNote(otherUser, org, note)).toBe(false);
  });

  it("ADMIN can write any note in their org", () => {
    const adminOrg = makeOrg("org1", Role.ADMIN);
    const note = makeNote("u1", Visibility.ORG);
    expect(canWriteNote(otherUser, adminOrg, note)).toBe(true);
  });

  it("OWNER can write any note in their org", () => {
    const ownerOrg = makeOrg("org1", Role.OWNER);
    const note = makeNote("u1", Visibility.PRIVATE);
    expect(canWriteNote(otherUser, ownerOrg, note)).toBe(true);
  });

  it("cannot write note from different org", () => {
    const wrongOrg = makeOrg("org2", Role.OWNER);
    const note = makeNote("u1", Visibility.ORG);
    expect(canWriteNote(author, wrongOrg, note)).toBe(false);
  });
});

describe("canDeleteNote", () => {
  const author = makeUser("u1");
  const admin = makeUser("u2");
  const owner = makeUser("u3");
  const otherMember = makeUser("u4");

  const note = makeNote("u1", Visibility.ORG);

  it("author can delete their own note", () => {
    expect(canDeleteNote(author, makeOrg("org1", Role.MEMBER), note)).toBe(true);
  });

  it("ADMIN cannot delete another user's note", () => {
    expect(canDeleteNote(admin, makeOrg("org1", Role.ADMIN), note)).toBe(false);
  });

  it("OWNER can delete any note", () => {
    expect(canDeleteNote(owner, makeOrg("org1", Role.OWNER), note)).toBe(true);
  });

  it("MEMBER cannot delete another user's note", () => {
    expect(canDeleteNote(otherMember, makeOrg("org1", Role.MEMBER), note)).toBe(false);
  });
});

describe("canReadFile", () => {
  const user = makeUser("u1");
  const org = makeOrg("org1", Role.MEMBER);

  it("org member can read file without note attachment", () => {
    expect(canReadFile(user, org, "org1")).toBe(true);
  });

  it("cannot read file from different org", () => {
    expect(canReadFile(user, org, "org2")).toBe(false);
  });

  it("can read file attached to readable note", () => {
    expect(
      canReadFile(user, org, "org1", {
        note: makeNote("u1", Visibility.PUBLIC),
        shares: [],
      })
    ).toBe(true);
  });

  it("cannot read file attached to private note without share", () => {
    expect(
      canReadFile(user, org, "org1", {
        note: makeNote("u2", Visibility.PRIVATE),
        shares: [],
      })
    ).toBe(false);
  });

  it("can read file attached to private note with share", () => {
    expect(
      canReadFile(user, org, "org1", {
        note: makeNote("u2", Visibility.PRIVATE),
        shares: [{ userId: "u1" }],
      })
    ).toBe(true);
  });
});

describe("canInviteMembers", () => {
  it("OWNER can invite", () =>
    expect(canInviteMembers(makeOrg("org1", Role.OWNER))).toBe(true));
  it("ADMIN can invite", () =>
    expect(canInviteMembers(makeOrg("org1", Role.ADMIN))).toBe(true));
  it("MEMBER cannot invite", () =>
    expect(canInviteMembers(makeOrg("org1", Role.MEMBER))).toBe(false));
});

describe("canChangeRole", () => {
  it("OWNER can promote to OWNER", () =>
    expect(canChangeRole(makeOrg("org1", Role.OWNER), Role.OWNER)).toBe(true));
  it("OWNER can promote to ADMIN", () =>
    expect(canChangeRole(makeOrg("org1", Role.OWNER), Role.ADMIN)).toBe(true));
  it("ADMIN cannot promote to OWNER", () =>
    expect(canChangeRole(makeOrg("org1", Role.ADMIN), Role.OWNER)).toBe(false));
  it("ADMIN cannot promote to ADMIN", () =>
    expect(canChangeRole(makeOrg("org1", Role.ADMIN), Role.ADMIN)).toBe(false));
  it("ADMIN can demote to MEMBER", () =>
    expect(canChangeRole(makeOrg("org1", Role.ADMIN), Role.MEMBER)).toBe(true));
  it("MEMBER cannot change any role", () =>
    expect(canChangeRole(makeOrg("org1", Role.MEMBER), Role.MEMBER)).toBe(false));
});
