import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { isAtLeast } from "@/lib/permissions";
import { Role } from "@/generated/prisma";

const ACTION_COLORS: Record<string, string> = {
  "auth.register": "bg-blue-100 text-blue-800",
  "auth.login": "bg-green-100 text-green-800",
  "auth.logout": "bg-gray-100 text-gray-700",
  "auth.login_failed": "bg-red-100 text-red-800",
  "org.create": "bg-purple-100 text-purple-800",
  "org.invite": "bg-indigo-100 text-indigo-800",
  "org.join": "bg-teal-100 text-teal-800",
  "org.role_change": "bg-yellow-100 text-yellow-800",
  "org.member_remove": "bg-orange-100 text-orange-800",
  "note.create": "bg-emerald-100 text-emerald-800",
  "note.read": "bg-sky-100 text-sky-800",
  "note.update": "bg-cyan-100 text-cyan-800",
  "note.delete": "bg-red-100 text-red-800",
  "note.permission_denied": "bg-red-200 text-red-900",
  "ai.summarize": "bg-violet-100 text-violet-800",
  "ai.accept": "bg-violet-200 text-violet-900",
  "ai.permission_denied": "bg-red-200 text-red-900",
  "search.query": "bg-slate-100 text-slate-700",
};

function ActionBadge({ action }: { action: string }) {
  const colorClass = ACTION_COLORS[action] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
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

  if (!isAtLeast(membership.role as Role, Role.ADMIN)) {
    redirect("/dashboard");
  }

  const logs = await db.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      userId: true,
      user: { select: { email: true } },
      resourceType: true,
      resourceId: true,
      metadata: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">Audit Log</span>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Activity log for <span className="font-medium">{membership.org.name}</span> &mdash; last 100 events
          </p>
        </div>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No audit log entries yet.
                    </td>
                  </tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">
                      {new Date(log.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {log.user?.email ?? log.userId ?? <span className="text-gray-400 italic">system</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {log.resourceType && (
                        <span className="font-medium text-gray-700">{log.resourceType}</span>
                      )}
                      {log.resourceId && (
                        <span className="ml-1 font-mono text-xs text-gray-400">
                          {log.resourceId}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
