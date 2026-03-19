import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { NoteEditor } from "@/components/notes/NoteEditor";

export default async function EditNotePage({
  params,
}: {
  params: { noteId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.activeOrgId) redirect("/dashboard");
  const currentUserId = session.user.id;

  const [note, tags] = await Promise.all([
    db.note.findUnique({
      where: { id: params.noteId },
      include: { tags: true },
    }),
    db.tag.findMany({
      where: { orgId: session.activeOrgId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!note) notFound();

  const canEdit = note.authorId === currentUserId;
  if (!canEdit) redirect(`/notes/${params.noteId}`);

  return (
    <NoteEditor
      mode="edit"
      note={{
        id: note.id,
        title: note.title,
        content: note.content,
        visibility: note.visibility,
        tagIds: note.tags.map((t) => t.tagId),
        isAuthor: note.authorId === currentUserId,
      }}
      orgTags={tags}
    />
  );
}
