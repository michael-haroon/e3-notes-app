import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { TemplatesList } from "@/components/notes/TemplatesList";

export default async function TemplatesPage() {
  const session = await getSession().catch(() => null);
  if (!session) redirect("/login");
  if (!session.activeOrgId) redirect("/dashboard");

  const templates = await db.noteTemplate.findMany({
    where: { orgId: session.activeOrgId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">Templates</h1>
          <p className="text-sm text-dim mt-0.5">Reusable note structures for your team</p>
        </div>
        <Link
          href="/templates/new"
          className="flex items-center gap-1.5 bg-[var(--accent)] text-white px-4 py-2 rounded-card text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Template
        </Link>
      </div>

      <TemplatesList templates={templates} />
    </div>
  );
}
