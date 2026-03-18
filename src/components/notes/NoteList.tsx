import Link from "next/link";
import { Visibility } from "@/generated/prisma/enums";

type Note = {
  id: string;
  title: string;
  content: string;
  visibility: Visibility;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; email: string };
  tags: { tag: { id: string; name: string } }[];
  _count: { versions: number; files: number };
};

const visibilityBadge: Record<Visibility, { label: string; className: string }> = {
  PUBLIC: { label: "Public", className: "bg-green-100 text-green-700" },
  ORG: { label: "Org", className: "bg-blue-100 text-blue-700" },
  PRIVATE: { label: "Private", className: "bg-gray-100 text-gray-700" },
};

export function NoteList({
  notes,
  currentUserId,
}: {
  notes: Note[];
  currentUserId: string;
}) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg mb-2">No notes yet</p>
        <p className="text-sm">Create your first note to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const badge = visibilityBadge[note.visibility];
        const isOwn = note.authorId === currentUserId;
        return (
          <Link
            key={note.id}
            href={`/notes/${note.id}`}
            className="block bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{note.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {note.content.slice(0, 150) || "No content"}
                </p>
                {note.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {note.tags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-gray-400 shrink-0">
                <p>{isOwn ? "You" : (note.author.name ?? note.author.email)}</p>
                <p className="mt-1">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2 justify-end mt-1">
                  {note._count.versions > 0 && (
                    <span>{note._count.versions}v</span>
                  )}
                  {note._count.files > 0 && (
                    <span>{note._count.files} files</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
