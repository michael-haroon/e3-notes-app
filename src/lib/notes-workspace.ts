import { Visibility } from "@/generated/prisma/enums";
import type { NoteListNote } from "@/components/notes/NoteList";

export type SortOption = "recent" | "oldest" | "title-asc" | "title-desc";

export type NotesWorkspaceFilters = {
  query: string;
  authorId: string;
  visibility: "all" | Visibility;
  sortBy: SortOption;
};

export const DEFAULT_NOTES_WORKSPACE_FILTERS: NotesWorkspaceFilters = {
  query: "",
  authorId: "",
  visibility: "all",
  sortBy: "recent",
};

const validSortOptions = new Set<SortOption>(["recent", "oldest", "title-asc", "title-desc"]);
const validVisibilityOptions = new Set<"all" | Visibility>(["all", Visibility.ORG, Visibility.PRIVATE]);

export function readNotesWorkspaceFilters(searchParams: URLSearchParams): NotesWorkspaceFilters {
  const sortByParam = searchParams.get("sort") ?? DEFAULT_NOTES_WORKSPACE_FILTERS.sortBy;
  const visibilityParam = searchParams.get("visibility") ?? DEFAULT_NOTES_WORKSPACE_FILTERS.visibility;

  return {
    query: searchParams.get("q") ?? DEFAULT_NOTES_WORKSPACE_FILTERS.query,
    authorId: searchParams.get("authorId") ?? DEFAULT_NOTES_WORKSPACE_FILTERS.authorId,
    visibility: validVisibilityOptions.has(visibilityParam as "all" | Visibility)
      ? (visibilityParam as "all" | Visibility)
      : DEFAULT_NOTES_WORKSPACE_FILTERS.visibility,
    sortBy: validSortOptions.has(sortByParam as SortOption)
      ? (sortByParam as SortOption)
      : DEFAULT_NOTES_WORKSPACE_FILTERS.sortBy,
  };
}

export function createNotesWorkspaceSearchParams(filters: NotesWorkspaceFilters) {
  const params = new URLSearchParams();

  const query = filters.query.trim();
  if (query) params.set("q", query);
  if (filters.authorId) params.set("authorId", filters.authorId);
  if (filters.visibility !== DEFAULT_NOTES_WORKSPACE_FILTERS.visibility) {
    params.set("visibility", filters.visibility);
  }
  if (filters.sortBy !== DEFAULT_NOTES_WORKSPACE_FILTERS.sortBy) {
    params.set("sort", filters.sortBy);
  }

  return params;
}

export function hasActiveNotesWorkspaceFilters(filters: NotesWorkspaceFilters) {
  return (
    filters.query.trim().length > 0 ||
    filters.authorId !== DEFAULT_NOTES_WORKSPACE_FILTERS.authorId ||
    filters.visibility !== DEFAULT_NOTES_WORKSPACE_FILTERS.visibility ||
    filters.sortBy !== DEFAULT_NOTES_WORKSPACE_FILTERS.sortBy
  );
}

export function filterAndSortNotes(notes: NoteListNote[], filters: NotesWorkspaceFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  const matches = notes.filter((note) => {
    const authorLabel = note.author.name ?? note.author.email;
    const searchableText = [
      note.title,
      note.content,
      authorLabel,
      ...note.tags.map(({ tag }) => tag.name),
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
    const matchesAuthor = !filters.authorId || note.authorId === filters.authorId;
    const matchesVisibility =
      filters.visibility === "all" || note.visibility === filters.visibility;

    return matchesQuery && matchesAuthor && matchesVisibility;
  });

  return [...matches].sort((a, b) => {
    switch (filters.sortBy) {
      case "oldest":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "recent":
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });
}
