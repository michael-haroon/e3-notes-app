import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/actions/orgs";
import { db } from "@/lib/db";

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/invite/${params.token}`);
  }

  const invite = await db.orgInvite.findUnique({
    where: { token: params.token },
    include: { org: true },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Invalid Invite</h1>
          <p className="text-gray-600">This invite link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  // Auto-accept the invite
  try {
    await acceptInvite(params.token);
    redirect("/dashboard");
  } catch (err) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">
            {err instanceof Error ? err.message : "Failed to accept invite"}
          </p>
        </div>
      </div>
    );
  }
}
