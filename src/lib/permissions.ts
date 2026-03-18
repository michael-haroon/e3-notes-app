import { Role, Visibility } from "@/generated/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type OrgContext = {
  orgId: string;
  role: Role;
};

export type NoteContext = {
  authorId: string;
  visibility: Visibility;
  orgId: string;
};

export type ShareEntry = {
  userId: string;
};

// ── Role hierarchy ──────────────────────────────────────────────────────────

export function isAtLeast(role: Role, minimum: Role): boolean {
  const order: Role[] = [Role.MEMBER, Role.ADMIN, Role.OWNER];
  return order.indexOf(role) >= order.indexOf(minimum);
}

// ── Note permissions ────────────────────────────────────────────────────────

/**
 * Can the user read this note?
 * - PUBLIC: any org member
 * - ORG: any org member
 * - PRIVATE: author or explicit NoteShare entry
 */
export function canReadNote(
  user: SessionUser,
  org: OrgContext,
  note: NoteContext,
  shares: ShareEntry[] = []
): boolean {
  // Must be a member of the note's org
  if (org.orgId !== note.orgId) return false;

  if (note.visibility === Visibility.PRIVATE) {
    if (note.authorId === user.id) return true;
    return shares.some((s) => s.userId === user.id);
  }

  // PUBLIC or ORG — any org member
  return true;
}

/**
 * Can the user write (edit) this note?
 * - Author always can
 * - ADMIN or OWNER can edit any note in their org
 */
export function canWriteNote(
  user: SessionUser,
  org: OrgContext,
  note: NoteContext
): boolean {
  if (org.orgId !== note.orgId) return false;
  if (note.authorId === user.id) return true;
  return isAtLeast(org.role, Role.ADMIN);
}

/**
 * Can the user delete this note?
 * - Author can delete their own note
 * - OWNER can delete any note in their org
 */
export function canDeleteNote(
  user: SessionUser,
  org: OrgContext,
  note: NoteContext
): boolean {
  if (org.orgId !== note.orgId) return false;
  if (note.authorId === user.id) return true;
  return org.role === Role.OWNER;
}

// ── File permissions ─────────────────────────────────────────────────────────

/**
 * Can the user read a file?
 * - Must be org member
 * - If file is attached to a note, must also canReadNote
 */
export function canReadFile(
  user: SessionUser,
  org: OrgContext,
  fileOrgId: string,
  noteContext?: { note: NoteContext; shares: ShareEntry[] }
): boolean {
  if (org.orgId !== fileOrgId) return false;
  if (noteContext) {
    return canReadNote(user, org, noteContext.note, noteContext.shares);
  }
  return true;
}

// ── Org permissions ───────────────────────────────────────────────────────────

export function canInviteMembers(org: OrgContext): boolean {
  return isAtLeast(org.role, Role.ADMIN);
}

export function canChangeRole(
  org: OrgContext,
  targetRole: Role
): boolean {
  // Only OWNER can assign OWNER or ADMIN roles
  if (targetRole === Role.OWNER) return org.role === Role.OWNER;
  if (targetRole === Role.ADMIN) return org.role === Role.OWNER;
  return isAtLeast(org.role, Role.ADMIN);
}

export function canRemoveMember(
  org: OrgContext,
  targetUserId: string,
  requestingUserId: string
): boolean {
  // Members can remove themselves
  if (targetUserId === requestingUserId) return true;
  return isAtLeast(org.role, Role.ADMIN);
}
