import { describe, expect, it } from "vitest";
import { Visibility } from "@/generated/prisma/enums";
import type { NoteListNote } from "@/components/notes/NoteList";
import {
  createNotesWorkspaceSearchParams,
  DEFAULT_NOTES_WORKSPACE_FILTERS,
  filterAndSortNotes,
  hasActiveNotesWorkspaceFilters,
  readNotesWorkspaceFilters,
} from "@/lib/notes-workspace";

function makeNote(overrides: Partial<NoteListNote>): NoteListNote {
  return {
    id: overrides.id ?? "note-1",
    title: overrides.title ?? "Quarterly roadmap",
    content: overrides.content ?? "Migration checklist and launch notes",
    visibility: overrides.visibility ?? Visibility.ORG,
    authorId: overrides.authorId ?? "user-1",
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-02T00:00:00.000Z"),
    author: overrides.author ?? { id: overrides.authorId ?? "user-1", name: "User 1", email: "user1@example.com" },
    tags: overrides.tags ?? [],
    _count: overrides._count ?? { versions: 0, files: 0 },
  };
}

describe("notes workspace filters", () => {
  it("filters by query across title, content, author, and tags", () => {
    const notes = [
      makeNote({ id: "title", title: "Design doc", content: "Alpha", author: { id: "u1", name: "Alex", email: "alex@example.com" } }),
      makeNote({ id: "content", title: "Sprint recap", content: "Launch checklist", author: { id: "u2", name: "Bailey", email: "bailey@example.com" } }),
      makeNote({
        id: "tag",
        title: "Backlog",
        content: "Items",
        author: { id: "u3", name: "Casey", email: "casey@example.com" },
        tags: [{ tag: { id: "tag-1", name: "research" } }],
      }),
    ];

    expect(filterAndSortNotes(notes, { ...DEFAULT_NOTES_WORKSPACE_FILTERS, query: "design" }).map((note) => note.id)).toEqual(["title"]);
    expect(filterAndSortNotes(notes, { ...DEFAULT_NOTES_WORKSPACE_FILTERS, query: "launch" }).map((note) => note.id)).toEqual(["content"]);
    expect(filterAndSortNotes(notes, { ...DEFAULT_NOTES_WORKSPACE_FILTERS, query: "casey" }).map((note) => note.id)).toEqual(["tag"]);
    expect(filterAndSortNotes(notes, { ...DEFAULT_NOTES_WORKSPACE_FILTERS, query: "research" }).map((note) => note.id)).toEqual(["tag"]);
  });

  it("combines author and visibility filters", () => {
    const notes = [
      makeNote({ id: "visible", authorId: "user-2", author: { id: "user-2", name: "User 2", email: "user2@example.com" }, visibility: Visibility.PRIVATE }),
      makeNote({ id: "wrong-visibility", authorId: "user-2", author: { id: "user-2", name: "User 2", email: "user2@example.com" }, visibility: Visibility.ORG }),
      makeNote({ id: "wrong-author", authorId: "user-3", author: { id: "user-3", name: "User 3", email: "user3@example.com" }, visibility: Visibility.PRIVATE }),
    ];

    const result = filterAndSortNotes(notes, {
      ...DEFAULT_NOTES_WORKSPACE_FILTERS,
      authorId: "user-2",
      visibility: Visibility.PRIVATE,
    });

    expect(result.map((note) => note.id)).toEqual(["visible"]);
  });

  it("sorts by recency and title", () => {
    const notes = [
      makeNote({ id: "b", title: "Beta", updatedAt: new Date("2026-01-03T00:00:00.000Z") }),
      makeNote({ id: "a", title: "Alpha", updatedAt: new Date("2026-01-01T00:00:00.000Z") }),
      makeNote({ id: "c", title: "Gamma", updatedAt: new Date("2026-01-02T00:00:00.000Z") }),
    ];

    expect(filterAndSortNotes(notes, DEFAULT_NOTES_WORKSPACE_FILTERS).map((note) => note.id)).toEqual(["b", "c", "a"]);
    expect(filterAndSortNotes(notes, { ...DEFAULT_NOTES_WORKSPACE_FILTERS, sortBy: "oldest" }).map((note) => note.id)).toEqual(["a", "c", "b"]);
    expect(filterAndSortNotes(notes, { ...DEFAULT_NOTES_WORKSPACE_FILTERS, sortBy: "title-asc" }).map((note) => note.id)).toEqual(["a", "b", "c"]);
    expect(filterAndSortNotes(notes, { ...DEFAULT_NOTES_WORKSPACE_FILTERS, sortBy: "title-desc" }).map((note) => note.id)).toEqual(["c", "b", "a"]);
  });

  it("serializes and restores non-default filters from the URL", () => {
    const params = createNotesWorkspaceSearchParams({
      query: "  launch checklist  ",
      authorId: "user-2",
      visibility: Visibility.PRIVATE,
      sortBy: "title-asc",
    });

    expect(params.toString()).toBe("q=launch+checklist&authorId=user-2&visibility=PRIVATE&sort=title-asc");
    expect(readNotesWorkspaceFilters(params)).toEqual({
      query: "launch checklist",
      authorId: "user-2",
      visibility: Visibility.PRIVATE,
      sortBy: "title-asc",
    });
  });

  it("falls back to defaults when URL params are invalid", () => {
    const params = new URLSearchParams("q=notes&visibility=PUBLIC&sort=weird&authorId=user-4");

    expect(readNotesWorkspaceFilters(params)).toEqual({
      query: "notes",
      authorId: "user-4",
      visibility: "all",
      sortBy: "recent",
    });
  });

  it("detects when filters are active", () => {
    expect(hasActiveNotesWorkspaceFilters(DEFAULT_NOTES_WORKSPACE_FILTERS)).toBe(false);
    expect(hasActiveNotesWorkspaceFilters({ ...DEFAULT_NOTES_WORKSPACE_FILTERS, query: " roadmap " })).toBe(true);
    expect(hasActiveNotesWorkspaceFilters({ ...DEFAULT_NOTES_WORKSPACE_FILTERS, authorId: "user-2" })).toBe(true);
  });
});
