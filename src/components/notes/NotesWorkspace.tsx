"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Visibility } from "@/generated/prisma/enums";
import { NoteList, type NoteListNote } from "@/components/notes/NoteList";
import {
  createNotesWorkspaceSearchParams,
  DEFAULT_NOTES_WORKSPACE_FILTERS,
  filterAndSortNotes,
  hasActiveNotesWorkspaceFilters,
  readNotesWorkspaceFilters,
  type SortOption,
} from "@/lib/notes-workspace";

type AuthorOption = {
  id: string;
  label: string;
};

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "oldest", label: "Oldest updated" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
];

const visibilityOptions = [
  { value: "all", label: "All" },
  { value: Visibility.ORG, label: "Org" },
  { value: Visibility.PRIVATE, label: "Private" },
] as const;

export function NotesWorkspace({
  notes,
  authors,
  currentUserId,
}: {
  notes: NoteListNote[];
  authors: AuthorOption[];
  currentUserId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlFilters = useMemo(
    () => readNotesWorkspaceFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [query, setQuery] = useState(urlFilters.query);
  const [selectedAuthorId, setSelectedAuthorId] = useState(urlFilters.authorId);
  const [selectedVisibility, setSelectedVisibility] = useState<"all" | Visibility>(urlFilters.visibility);
  const [sortBy, setSortBy] = useState<SortOption>(urlFilters.sortBy);

  useEffect(() => {
    setQuery(urlFilters.query);
    setSelectedAuthorId(urlFilters.authorId);
    setSelectedVisibility(urlFilters.visibility);
    setSortBy(urlFilters.sortBy);
  }, [urlFilters.authorId, urlFilters.query, urlFilters.sortBy, urlFilters.visibility]);

  const filters = useMemo(
    () => ({
      query,
      authorId: selectedAuthorId,
      visibility: selectedVisibility,
      sortBy,
    }),
    [query, selectedAuthorId, selectedVisibility, sortBy]
  );

  useEffect(() => {
    const nextParams = createNotesWorkspaceSearchParams({
      query,
      authorId: selectedAuthorId,
      visibility: selectedVisibility,
      sortBy,
    }).toString();
    const currentParams = searchParams.toString();

    if (nextParams === currentParams) return;

    const nextUrl = nextParams ? `${pathname}?${nextParams}` : pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [pathname, query, searchParams, selectedAuthorId, selectedVisibility, sortBy]);

  const filteredNotes = useMemo(() => filterAndSortNotes(notes, filters), [filters, notes]);
  const hasActiveFilters = hasActiveNotesWorkspaceFilters({
    query,
    authorId: selectedAuthorId,
    visibility: selectedVisibility,
    sortBy,
  });

  function resetFilters() {
    setQuery(DEFAULT_NOTES_WORKSPACE_FILTERS.query);
    setSelectedAuthorId(DEFAULT_NOTES_WORKSPACE_FILTERS.authorId);
    setSelectedVisibility(DEFAULT_NOTES_WORKSPACE_FILTERS.visibility);
    setSortBy(DEFAULT_NOTES_WORKSPACE_FILTERS.sortBy);
  }

  return (
    <div className="space-y-5">
      <div className="ui-card overflow-hidden">
        <div className="grid gap-4 border-b border-[var(--border-color)] p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Search Notes</p>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, content, tag, or author"
                className="ui-input w-full py-2.5 pl-10 pr-4 text-[14px]"
              />
            </div>
            <p className="text-[12px] text-dim">
              {filteredNotes.length} of {notes.length} note{notes.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <label htmlFor="notes-author-filter" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Author
              </label>
              <select
                id="notes-author-filter"
                value={selectedAuthorId}
                onChange={(e) => setSelectedAuthorId(e.target.value)}
                className="ui-select w-full text-[13px]"
              >
                <option value="">All authors</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="notes-sort-select" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Sort
              </label>
              <select
                id="notes-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="ui-select w-full text-[13px]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Visibility</p>
            <div className="flex flex-wrap gap-1.5">
              {visibilityOptions.map((option) => {
                const active = selectedVisibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedVisibility(option.value)}
                    className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                      active
                        ? "border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border-color)] bg-surface text-dim hover:border-[var(--accent)]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="ui-btn-secondary px-4 py-2 text-[12px]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filteredNotes.length > 0 ? (
        <NoteList notes={filteredNotes} currentUserId={currentUserId} />
      ) : (
        <div className="ui-card flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-subtle">
            <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="mb-1 font-display text-base font-medium text-ink">No notes match these filters</p>
          <p className="mb-5 text-sm text-dim">Try a different author, visibility, or search phrase.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="ui-btn-secondary"
          >
            Reset view
          </button>
        </div>
      )}
    </div>
  );
}
