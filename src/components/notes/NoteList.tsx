import Link from "next/link";
import { Visibility } from "@/generated/prisma/enums";

export type NoteListNote = {
  id: string;
  title: string;
  content: string;
  visibility: Visibility;
  authorId: string;
  pinnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; email: string };
  tags: { tag: { id: string; name: string } }[];
  _count: { versions: number; files: number };
};

const visTag: Record<string, string> = {
  PUBLIC:  "bg-ok-soft text-ok",
  ORG:     "bg-[var(--accent-soft)] text-[var(--accent)]",
  PRIVATE: "bg-subtle text-muted",
};

const visLabel: Record<string, string> = {
  PUBLIC: "Public", ORG: "Org", PRIVATE: "Private",
};

export function NoteList({
  notes,
  currentUserId,
  selectionMode = false,
  selectedIds = [],
  onToggleSelect,
}: {
  notes: NoteListNote[];
  currentUserId: string;
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-subtle flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="font-display text-base font-medium text-ink mb-1">No notes yet</p>
        <p className="text-sm text-dim mb-5">Create your first note to get started.</p>
        <Link href="/notes/new" className="flex items-center gap-1.5 bg-[var(--accent)] text-white px-4 py-2 rounded-card text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Note
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => {
        const isOwn = note.authorId === currentUserId;
        const isPinned = !!note.pinnedAt;
        const isSelected = selectedIds.includes(note.id);
        const preview = note.content.replace(/\n+/g, " ").trim();
        const daysSince = Math.floor((Date.now() - new Date(note.updatedAt).getTime()) / 86_400_000);
        const dateLabel =
          daysSince === 0 ? "Today" :
          daysSince === 1 ? "Yesterday" :
          daysSince < 7   ? `${daysSince}d ago` :
          new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

        const cardClasses = `group flex items-start gap-4 bg-surface border rounded-card px-5 py-4 transition-all cursor-pointer ${
          isSelected
            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
            : "border-[var(--border-color)] hover:shadow-card hover:border-[var(--border-strong)]"
        }`;

        if (selectionMode) {
          return (
            <div
              key={note.id}
              data-testid="note-card"
              data-note-visibility={note.visibility}
              data-note-author={isOwn ? "You" : (note.author.name ?? note.author.email)}
              className={cardClasses}
              onClick={() => onToggleSelect?.(note.id)}
            >
              {/* Checkbox */}
              <div className={`w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                isSelected ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border-strong)] bg-surface"
              }`}>
                {isSelected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
              <NoteCardContent note={note} isOwn={isOwn} isPinned={isPinned} preview={preview} dateLabel={dateLabel} />
            </div>
          );
        }

        return (
          <Link
            key={note.id}
            href={`/notes/${note.id}`}
            data-testid="note-card"
            data-note-visibility={note.visibility}
            data-note-author={isOwn ? "You" : (note.author.name ?? note.author.email)}
            className={cardClasses}
          >
            <NoteCardContent note={note} isOwn={isOwn} isPinned={isPinned} preview={preview} dateLabel={dateLabel} />
          </Link>
        );
      })}
    </div>
  );
}

function NoteCardContent({ note, isOwn, isPinned, preview, dateLabel }: {
  note: NoteListNote;
  isOwn: boolean;
  isPinned: boolean;
  preview: string;
  dateLabel: string;
}) {
  return (
    <>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {isPinned && (
            <svg className="w-3 h-3 text-[var(--accent)] shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
          )}
          <h3 className="font-medium text-ink text-[14px] truncate group-hover:text-[var(--accent)] transition-colors">
            {note.title}
          </h3>
          <span className={`text-[11px] px-1.5 py-0.5 rounded-[4px] font-medium shrink-0 ${visTag[note.visibility]}`}>
            <span data-testid="note-visibility">{visLabel[note.visibility]}</span>
          </span>
        </div>
        {preview && (
          <p className="text-[13px] text-dim line-clamp-1 leading-relaxed">
            {preview}
          </p>
        )}
        {note.tags.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {note.tags.map(({ tag }) => (
              <span key={tag.id} className="text-[11px] bg-subtle text-dim px-2 py-0.5 rounded-full">
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="text-right text-[12px] text-muted shrink-0 space-y-1">
        <p data-testid="note-author" className="text-dim font-medium">{isOwn ? "You" : (note.author.name ?? note.author.email)}</p>
        <p>{dateLabel}</p>
        {(note._count.versions > 0 || note._count.files > 0) && (
          <div className="flex items-center gap-2 justify-end">
            {note._count.versions > 0 && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {note._count.versions}
              </span>
            )}
            {note._count.files > 0 && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                {note._count.files}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
