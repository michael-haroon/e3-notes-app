"use client";

import { useState, useEffect } from "react";
import { updateNote } from "@/actions/notes";
import { createTag } from "@/actions/tags";

type Tag = { id: string; name: string };

export function TagManager({
  noteId,
  currentTagIds,
}: {
  noteId: string;
  currentTagIds: string[];
}) {
  const [orgTags, setOrgTags] = useState<Tag[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(currentTagIds);
  const [newTagName, setNewTagName] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setOrgTags(d.tags ?? []));
  }, []);

  function toggle(tagId: string) {
    setSelectedIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateNote({ noteId, tagIds: selectedIds });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setCreating(true);
    try {
      const tag = await createTag(newTagName.trim());
      setOrgTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedIds((prev) => [...prev, tag.id]);
      setNewTagName("");
    } finally {
      setCreating(false);
    }
  }

  const changed =
    selectedIds.length !== currentTagIds.length ||
    selectedIds.some((id) => !currentTagIds.includes(id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {orgTags.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                selected
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >
              #{tag.name}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleCreateTag} className="flex gap-2">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name"
          className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={creating || !newTagName.trim()}
          className="text-xs px-3 py-1 bg-gray-100 border rounded hover:bg-gray-200 disabled:opacity-50"
        >
          {creating ? "..." : "+ Create"}
        </button>
      </form>

      {changed && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save tags"}
        </button>
      )}
    </div>
  );
}
