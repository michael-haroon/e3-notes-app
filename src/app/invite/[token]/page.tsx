import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/actions/orgs";
import { switchActiveOrg } from "@/actions/session";
import { db } from "@/lib/db";

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect(`/login?redirect_url=/invite/${params.token}`);
  }

  const invite = await db.orgInvite.findUnique({
    where: { token: params.token },
    include: { org: true },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="bg-surface border border-[var(--border-color)] rounded-card p-8 text-center max-w-sm shadow-float">
          <h1 className="font-display text-xl font-semibold text-bad mb-2">Invalid Invite</h1>
          <p className="text-dim text-[13px]">This invite link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  try {
    const result = await acceptInvite(params.token);
    await switchActiveOrg(result.orgId);
    redirect("/dashboard");
  } catch (err) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="bg-surface border border-[var(--border-color)] rounded-card p-8 text-center max-w-sm shadow-float">
          <h1 className="font-display text-xl font-semibold text-bad mb-2">Error</h1>
          <p className="text-dim text-[13px]">
            {err instanceof Error ? err.message : "Failed to accept invite"}
          </p>
        </div>
      </div>
    );
  }
}
