import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { TemplateEditor } from "@/components/notes/TemplateEditor";

export default async function EditTemplatePage({ params }: { params: { templateId: string } }) {
  const session = await getSession().catch(() => null);
  if (!session) redirect("/login");
  if (!session.activeOrgId) redirect("/dashboard");

  const template = await db.noteTemplate.findUnique({ where: { id: params.templateId } });
  if (!template || template.orgId !== session.activeOrgId) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-1.5 text-[12px] text-dim mb-6">
        <Link href="/templates" className="hover:text-ink transition-colors">Templates</Link>
        <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-ink truncate max-w-[160px]">{template.title}</span>
        <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-ink">Edit</span>
      </div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-7 tracking-tight">Edit Template</h1>
      <TemplateEditor
        mode="edit"
        template={{ id: template.id, title: template.title, content: template.content }}
      />
    </div>
  );
}
