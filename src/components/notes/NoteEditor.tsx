"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createNote, updateNote } from "@/actions/notes";
import { Visibility } from "@/generated/prisma/enums";

type Tag = { id: string; name: string };

type NoteEditorProps =
  | { mode: "create"; orgTags: Tag[] }
  | {
      mode: "edit";
      note: { id: string; title: string; content: string; visibility: Visibility; tagIds: string[]; isAuthor: boolean };
      orgTags: Tag[];
    };

export function NoteEditor(props: NoteEditorProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const isAuthor = props.mode === "create" || props.note.isAuthor;

  const [title, setTitle] = useState(isEdit ? props.note.title : "");
  const [content, setContent] = useState(isEdit ? props.note.content : "");
  const [visibility, setVisibility] = useState<Visibility>(isEdit ? props.note.visibility : Visibility.ORG);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(isEdit ? props.note.tagIds : []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await updateNote({ noteId: props.note.id, title: title.trim(), content, visibility, tagIds: selectedTagIds });
        router.push(`/notes/${props.note.id}`);
      } else {
        const result = await createNote({ title: title.trim(), content, visibility, tagIds: selectedTagIds });
        router.push(`/notes/${result.noteId}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !isEdit) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("noteId", props.note.id);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-1.5 text-[12px] text-dim mb-6">
        <Link href="/dashboard" className="hover:text-ink transition-colors">Notes</Link>
        {isEdit && (
          <>
            <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <Link href={`/notes/${props.note.id}`} className="hover:text-ink truncate max-w-[160px] transition-colors">{props.note.title}</Link>
          </>
        )}
        <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-ink">{isEdit ? "Edit" : "New Note"}</span>
      </div>

      <h1 className="font-display text-2xl font-semibold text-ink mb-7 tracking-tight">
        {isEdit ? "Edit Note" : "New Note"}
      </h1>

      {error && (
        <div className="mb-5 p-3 bg-bad-soft border border-[var(--red-soft)] text-bad rounded-card text-[13px] flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1.5 uppercase tracking-widest">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (error) setError(""); }}
            required
            autoFocus={!isEdit}
            className="w-full bg-surface border border-[var(--border-color)] rounded-card px-4 py-2.5 text-[14px] text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
            placeholder="Note title"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1.5 uppercase tracking-widest">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="w-full bg-surface border border-[var(--border-color)] rounded-card px-4 py-3 text-[14px] text-ink placeholder-muted font-mono leading-[1.7] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors resize-y"
            placeholder="Write your note here…"
          />
        </div>

        {isAuthor && (
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-2 uppercase tracking-widest">Visibility</label>
            <div className="flex gap-2">
              {([Visibility.ORG, Visibility.PRIVATE] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`px-4 py-2 text-[12px] font-medium rounded-[7px] border transition-colors ${
                    visibility === v
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-soft)]"
                      : "bg-surface text-dim border-[var(--border-color)] hover:bg-subtle"
                  }`}
                >
                  {v === Visibility.ORG ? "Org — all members" : "Private — only me"}
                </button>
              ))}
            </div>
          </div>
        )}

        {props.orgTags.length > 0 && (
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-2 uppercase tracking-widest">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {props.orgTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                      : "bg-surface text-dim border-[var(--border-color)] hover:border-[var(--accent)]"
                  }`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-[var(--accent)] text-white px-5 py-2.5 rounded-card text-[13px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create note"}
          </button>
          <Link
            href={isEdit ? `/notes/${props.note.id}` : "/dashboard"}
            className="px-5 py-2.5 border border-[var(--border-color)] text-dim text-[13px] font-medium rounded-card hover:bg-subtle transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {isEdit && (
        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
          <label className="block text-[11px] font-semibold text-muted mb-3 uppercase tracking-widest">Attach File</label>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <div className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] rounded-[7px] bg-surface hover:bg-subtle transition-colors text-[13px] text-dim hover:text-ink">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
              {uploading ? "Uploading…" : "Attach file"}
            </div>
            <input type="file" onChange={handleFileUpload} disabled={uploading} className="sr-only" />
          </label>
        </div>
      )}
    </div>
  );
}
