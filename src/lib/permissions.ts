import { Role, Visibility } from "@/generated/prisma/enums";

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
 * - ORG: any org member (including admin/owner)
 * - PRIVATE: author, explicit NoteShare entry, or admin/owner in the org
 */
export function canReadNote(
  user: SessionUser,
  org: OrgContext,
  note: NoteContext,
  shares: ShareEntry[] = []
): boolean {
  if (org.orgId !== note.orgId) return false;

  if (note.visibility === Visibility.PRIVATE) {
    if (note.authorId === user.id) return true;
    if (shares.some((s) => s.userId === user.id)) return true;
    return isAtLeast(org.role, Role.ADMIN);
  }

  // ORG — any org member
  return true;
}

/**
 * Can the user write (edit content/title/tags of) this note?
 * Only the original author can edit. Admin/Owner can delete but not edit.
 */
export function canWriteNote(
  user: SessionUser,
  org: OrgContext,
  note: NoteContext
): boolean {
  if (org.orgId !== note.orgId) return false;
  return note.authorId === user.id;
}

/**
 * Can the user change the visibility of this note?
 * Only the original author can change visibility.
 */
export function canChangeVisibility(
  user: SessionUser,
  note: NoteContext
): boolean {
  return note.authorId === user.id;
}

/**
 * Can the user delete this note?
 * - Author, ADMIN, or OWNER can delete any note in their org
 */
export function canDeleteNote(
  user: SessionUser,
  org: OrgContext,
  note: NoteContext
): boolean {
  if (org.orgId !== note.orgId) return false;
  if (note.authorId === user.id) return true;
  return isAtLeast(org.role, Role.ADMIN);
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
