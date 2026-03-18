import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NoteEditor } from "@/components/notes/NoteEditor";

export default async function NewNotePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.activeOrgId) redirect("/orgs/new");

  const tags = await db.tag.findMany({
    where: { orgId: session.activeOrgId },
    orderBy: { name: "asc" },
  });

  return (
    <NoteEditor
      mode="create"
      orgTags={tags}
    />
  );
}
