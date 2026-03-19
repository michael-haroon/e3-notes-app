import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import AcceptInviteButton from "./AcceptInviteButton";

export default async function InvitesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const email = session.user.email;

  const invites = await db.orgInvite.findMany({
    where: {
      email,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { org: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">Pending Invites</span>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Pending Invites</h1>

        {invites.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
            <p className="text-lg mb-1">No pending invites</p>
            <p className="text-sm">When someone invites you to an org, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="bg-white rounded-xl border p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{invite.org.name}</p>
                  <p className="text-sm text-gray-500">
                    Role: <span className="capitalize">{invite.role.toLowerCase()}</span>
                    {" · "}Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <AcceptInviteButton token={invite.token} orgName={invite.org.name} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
