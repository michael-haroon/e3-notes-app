import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { SearchView } from "@/components/notes/SearchView";
import { db } from "@/lib/db";

export default async function SearchPage() {
  
  const session = await getSession().catch(() => null); if (!session) redirect("/login");
  if (!session.activeOrgId) redirect("/dashboard");

  const authors = await db.orgMember.findMany({
    where: { orgId: session.activeOrgId },
    select: {
      userId: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">Search</h1>
        <p className="text-sm text-dim mt-1">Search across all notes in this org</p>
      </div>
      <SearchView
        authors={authors.map((member) => ({
          id: member.userId,
          label: member.user.name ?? member.user.email,
        }))}
      />
    </div>
  );
}
