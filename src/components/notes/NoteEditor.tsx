"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createNote, updateNote } from "@/actions/notes";
import { Visibility } from "@/generated/prisma";

type Tag = { id: string; name: string };

type NoteEditorProps =
  | {
      mode: "create";
      orgTags: Tag[];
    }
  | {
      mode: "edit";
      note: {
        id: string;
        title: string;
        content: string;
        visibility: Visibility;
        tagIds: string[];
      };
      orgTags: Tag[];
    };

export function NoteEditor(props: NoteEditorProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [title, setTitle] = useState(isEdit ? props.note.title : "");
  const [content, setContent] = useState(isEdit ? props.note.content : "");
  const [visibility, setVisibility] = useState<Visibility>(
    isEdit ? props.note.visibility : Visibility.ORG
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    isEdit ? props.note.tagIds : []
  );
  const [newTagName, setNewTagName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (isEdit) {
        await updateNote({
          noteId: props.note.id,
          title,
          content,
          visibility,
          tagIds: selectedTagIds,
        });
        router.push(`/notes/${props.note.id}`);
      } else {
        const result = await createNote({
          title,
          content,
          visibility,
          tagIds: selectedTagIds,
        });
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
        {isEdit && (
          <>
            <span className="text-gray-300">/</span>
            <Link
              href={`/notes/${props.note.id}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {props.note.title}
            </Link>
          </>
        )}
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">{isEdit ? "Edit" : "New Note"}</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border p-8">
          <h1 className="text-xl font-bold mb-6">{isEdit ? "Edit Note" : "New Note"}</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Note title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="Write your note here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={Visibility.ORG}>Org (all members)</option>
                <option value={Visibility.PUBLIC}>Public (anyone)</option>
                <option value={Visibility.PRIVATE}>Private (only me)</option>
              </select>
            </div>

            {props.orgTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {props.orgTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        selectedTagIds.includes(tag.id)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                      }`}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : isEdit ? "Save changes" : "Create note"}
              </button>
              <Link
                href={isEdit ? `/notes/${props.note.id}` : "/dashboard"}
                className="px-6 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>

          {isEdit && (
            <div className="mt-6 pt-6 border-t">
              <label className="block text-sm font-medium mb-2">Attach File</label>
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="text-sm text-gray-600"
              />
              {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
