import { db } from "@/lib/db";
import { logger, LogAction } from "@/lib/logger";

export async function writeAuditLog({
  action,
  userId,
  orgId,
  resourceId,
  resourceType,
  metadata,
  ipAddress,
}: {
  action: LogAction;
  userId?: string | null;
  orgId?: string | null;
  resourceId?: string;
  resourceType?: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        action,
        userId,
        orgId,
        resourceId,
        resourceType,
        metadata: metadata as object | undefined,
        ipAddress,
      },
    });
    logger.info({ action, userId, orgId, resourceId, resourceType }, "audit");
  } catch (err) {
    // Audit log failure should never break the app, but we log it
    logger.error({ err, action }, "audit_log_write_failed");
  }
}
