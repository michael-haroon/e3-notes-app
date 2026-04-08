import { Role } from "@/generated/prisma/enums";

export function canCallerRemove(
  callerRole: Role,
  callerUserId: string,
  targetUserId: string,
  targetRole: Role
): boolean {
  if (callerUserId === targetUserId) return false;
  if (callerRole === Role.OWNER) return true;
  if (callerRole === Role.ADMIN) return targetRole === Role.MEMBER;
  return false;
}
