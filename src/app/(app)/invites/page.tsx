import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import AcceptInviteButton from "./AcceptInviteButton";

export default async function InvitesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const invites = await db.orgInvite.findMany({
    where: { email: session.user.email, usedAt: null, expiresAt: { gt: new Date() } },
    include: { org: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">Pending Invites</h1>
        <p className="text-sm text-dim mt-1">
          {invites.length === 0 ? "No pending invites" : `${invites.length} invite${invites.length !== 1 ? "s" : ""} waiting`}
        </p>
      </div>

      {invites.length === 0 ? (
        <div className="bg-surface border border-[var(--border-color)] rounded-card p-10 text-center shadow-card">
          <div className="w-10 h-10 rounded-full bg-subtle flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <p className="font-medium text-ink text-sm mb-1">No pending invites</p>
          <p className="text-[13px] text-dim">When someone invites you to an org, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {invites.map((invite) => (
            <div key={invite.id} className="bg-surface border border-[var(--border-color)] rounded-card px-5 py-4 flex items-center justify-between gap-4 shadow-card">
              <div>
                <p className="font-medium text-ink text-[14px]">{invite.org.name}</p>
                <p className="text-[12px] text-dim mt-0.5">
                  Role: <span className="font-medium text-ink capitalize">{invite.role.toLowerCase()}</span>
                  <span className="mx-1.5 text-muted">·</span>
                  Expires {new Date(invite.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
              <AcceptInviteButton token={invite.token} inviteId={invite.id} orgName={invite.org.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
