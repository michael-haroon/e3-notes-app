import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
});

export type LogAction =
  | "auth.register"
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  | "org.create"
  | "org.delete"
  | "org.invite"
  | "org.join"
  | "org.role_change"
  | "org.member_remove"
  | "note.create"
  | "note.read"
  | "note.update"
  | "note.delete"
  | "note.share"
  | "note.unshare"
  | "note.restore"
  | "note.permission_denied"
  | "file.upload"
  | "file.download"
  | "file.delete"
  | "file.permission_denied"
  | "tag.create"
  | "tag.delete"
  | "ai.summarize"
  | "ai.accept"
  | "ai.permission_denied"
  | "search.query"
  | "note.pin"
  | "note.unpin"
  | "note.bulk_delete"
  | "note.export"
  | "comment.create"
  | "comment.delete"
  | "template.create"
  | "template.delete"
  | "template.use";

export function logRequest(method: string, pathname: string, userId?: string, durationMs?: number, status?: number) {
  logger.info({ method, pathname, userId, durationMs, status }, "http");
}
export function logError(err: unknown, context?: Record<string, unknown>) {
  logger.error({ err: err instanceof Error ? { message: err.message, stack: err.stack } : err, ...context }, "error");
}
