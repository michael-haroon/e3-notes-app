import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isAtLeast } from "@/lib/permissions";
import { Role } from "@/generated/prisma";

const ACTION_COLORS: Record<string, string> = {
  "auth.register":         "bg-[var(--accent-soft)] text-[var(--accent)]",
  "auth.login":            "bg-ok-soft text-ok",
  "auth.logout":           "bg-subtle text-dim",
  "auth.login_failed":     "bg-bad-soft text-bad",
  "org.create":            "bg-[var(--accent-soft)] text-[var(--accent)]",
  "org.invite":            "bg-warn-soft text-warn",
  "org.join":              "bg-ok-soft text-ok",
  "org.role_change":       "bg-warn-soft text-warn",
  "org.member_remove":     "bg-bad-soft text-bad",
  "note.create":           "bg-ok-soft text-ok",
  "note.read":             "bg-subtle text-dim",
  "note.update":           "bg-[var(--accent-soft)] text-[var(--accent)]",
  "note.delete":           "bg-bad-soft text-bad",
  "note.permission_denied":"bg-bad-soft text-bad",
  "ai.summarize":          "bg-warn-soft text-warn",
  "ai.accept":             "bg-ok-soft text-ok",
  "ai.permission_denied":  "bg-bad-soft text-bad",
  "search.query":          "bg-subtle text-dim",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-subtle text-dim";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium font-mono ${cls}`}>
      {action}
    </span>
  );
}

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = session.activeOrgId;
  if (!orgId) redirect("/orgs/new");

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
    include: { org: true },
  });
  if (!membership) redirect("/dashboard");
  if (!isAtLeast(membership.role as Role, Role.ADMIN)) redirect("/dashboard");

  const logs = await db.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, action: true, userId: true,
      user: { select: { email: true } },
      resourceType: true, resourceId: true, createdAt: true,
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">Audit Log</h1>
        <p className="text-sm text-dim mt-1">
          Activity for <span className="font-medium text-ink">{membership.org.name}</span> — last {logs.length} events
        </p>
      </div>

      <div className="bg-surface border border-[var(--border-color)] rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-subtle">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted uppercase tracking-wider">Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-dim text-[13px]">
                    No audit log entries yet.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-subtle transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted">
                    {new Date(log.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-dim">
                    {log.user?.email ?? log.userId ?? <span className="text-muted italic">system</span>}
                  </td>
                  <td className="px-4 py-3 text-dim">
                    {log.resourceType && <span className="font-medium text-ink">{log.resourceType}</span>}
                    {log.resourceId && (
                      <span className="ml-1.5 font-mono text-[11px] text-muted">{log.resourceId.slice(0, 12)}…</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
