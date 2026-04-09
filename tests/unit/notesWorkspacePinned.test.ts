import { describe, expect, it } from "vitest";
import { Visibility } from "@/generated/prisma/enums";
import type { NoteListNote } from "@/components/notes/NoteList";
import { filterAndSortNotes, DEFAULT_NOTES_WORKSPACE_FILTERS } from "@/lib/notes-workspace";

function makeNote(overrides: Partial<NoteListNote>): NoteListNote {
  return {
    id: overrides.id ?? "note-1",
    title: overrides.title ?? "Untitled",
    content: overrides.content ?? "",
    visibility: overrides.visibility ?? Visibility.ORG,
    authorId: overrides.authorId ?? "user-1",
    pinnedAt: overrides.pinnedAt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-02T00:00:00.000Z"),
    author: overrides.author ?? { id: overrides.authorId ?? "user-1", name: "User 1", email: "user1@example.com" },
    tags: overrides.tags ?? [],
    _count: overrides._count ?? { versions: 0, files: 0 },
  };
}

describe("pinned notes sorting", () => {
  it("pinned notes appear before unpinned regardless of updated date", () => {
    const notes = [
      makeNote({ id: "old-pinned",   pinnedAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01") }),
      makeNote({ id: "new-unpinned",  pinnedAt: null,                  updatedAt: new Date("2026-01-10") }),
      makeNote({ id: "newer-pinned", pinnedAt: new Date("2026-01-05"), updatedAt: new Date("2026-01-05") }),
    ];

    const result = filterAndSortNotes(notes, DEFAULT_NOTES_WORKSPACE_FILTERS);
    // Both pinned notes come before unpinned
    expect(result[0].pinnedAt).not.toBeNull();
    expect(result[1].pinnedAt).not.toBeNull();
    expect(result[2].id).toBe("new-unpinned");
    // Among pinned notes, sorted by recency (newer-pinned has later updatedAt)
    expect(result[0].id).toBe("newer-pinned");
    expect(result[1].id).toBe("old-pinned");
  });

  it("unpinned notes still sort by recency among themselves", () => {
    const notes = [
      makeNote({ id: "a", pinnedAt: null, updatedAt: new Date("2026-01-01") }),
      makeNote({ id: "b", pinnedAt: null, updatedAt: new Date("2026-01-03") }),
      makeNote({ id: "c", pinnedAt: null, updatedAt: new Date("2026-01-02") }),
    ];

    const result = filterAndSortNotes(notes, DEFAULT_NOTES_WORKSPACE_FILTERS);
    expect(result.map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("multiple pinned notes sort by recency among themselves", () => {
    const notes = [
      makeNote({ id: "pin-old", pinnedAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01") }),
      makeNote({ id: "pin-new", pinnedAt: new Date("2026-01-05"), updatedAt: new Date("2026-01-05") }),
    ];

    const result = filterAndSortNotes(notes, DEFAULT_NOTES_WORKSPACE_FILTERS);
    expect(result[0].id).toBe("pin-new");
    expect(result[1].id).toBe("pin-old");
  });
});
