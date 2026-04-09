import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NoteEditor } from "@/components/notes/NoteEditor";

export default async function NewNotePage() {
  
  const session = await getSession().catch(() => null); if (!session) redirect("/login");
  if (!session.activeOrgId) redirect("/orgs/new");

  const [tags, templates] = await Promise.all([
    db.tag.findMany({
      where: { orgId: session.activeOrgId },
      orderBy: { name: "asc" },
    }),
    db.noteTemplate.findMany({
      where: { orgId: session.activeOrgId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <NoteEditor
      mode="create"
      orgTags={tags}
      templates={templates}
    />
  );
}
