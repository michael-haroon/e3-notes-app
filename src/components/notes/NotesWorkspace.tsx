"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Visibility } from "@/generated/prisma/enums";
import { NoteList, type NoteListNote } from "@/components/notes/NoteList";
import { bulkDeleteNotes, loadMoreNotes, searchNotes } from "@/actions/notes";
import { getActionError } from "@/lib/action-error";
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
  notes: initialNotes,
  totalNotes,
  authors,
  currentUserId,
}: {
  notes: NoteListNote[];
  totalNotes: number;
  authors: AuthorOption[];
  currentUserId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlFilters = useMemo(
    () => readNotesWorkspaceFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [query, setQuery] = useState(urlFilters.query);
  const [selectedAuthorId, setSelectedAuthorId] = useState(urlFilters.authorId);
  const [selectedVisibility, setSelectedVisibility] = useState<"all" | Visibility>(urlFilters.visibility);
  const [sortBy, setSortBy] = useState<SortOption>(urlFilters.sortBy);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Infinite scroll state
  const [allNotes, setAllNotes] = useState<NoteListNote[]>(initialNotes);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(totalNotes > initialNotes.length);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Track the sort that was used to fetch the current allNotes so we know when to re-fetch
  const loadedSortRef = useRef<SortOption>("recent");

  // Server search state
  const [searchResults, setSearchResults] = useState<NoteListNote[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Reset when server re-renders (e.g. after router.refresh())
  useEffect(() => {
    setAllNotes(initialNotes);
    setHasMore(totalNotes > initialNotes.length);
    setSearchResults(null);
  }, [initialNotes, totalNotes]);

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

  // Debounced server-side search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchNotes(trimmed);
        setSearchResults(results as NoteListNote[]);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Re-fetch from DB when sort changes (sort must be server-side across all notes)
  useEffect(() => {
    if (sortBy === loadedSortRef.current) return;
    loadedSortRef.current = sortBy;
    setLoadingMore(true);
    loadMoreNotes(0, sortBy)
      .then((fresh) => {
        setAllNotes(fresh as NoteListNote[]);
        setHasMore(fresh.length < totalNotes);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [sortBy, totalNotes]);

  // Infinite scroll via IntersectionObserver
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const more = await loadMoreNotes(allNotes.length, sortBy);
      if (more.length === 0) {
        setHasMore(false);
      } else {
        setAllNotes((prev) => [...prev, ...(more as NoteListNote[])]);
        setHasMore(allNotes.length + more.length < totalNotes);
      }
    } catch {
      // silently fail — user can scroll again
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, allNotes.length, totalNotes, sortBy]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) handleLoadMore();
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  const isSearchMode = query.trim().length > 0;

  // When searching: apply author/visibility filters on server results (skip text + sort — server handled both)
  // When browsing: filter only — DB order is authoritative, don't re-sort client-side
  const filteredNotes = useMemo(() => {
    if (isSearchMode && searchResults !== null) {
      return filterAndSortNotes(searchResults, { ...filters, query: "" });
    }
    if (!isSearchMode) {
      return allNotes.filter((note) => {
        const matchesAuthor = !filters.authorId || note.authorId === filters.authorId;
        const matchesVisibility = filters.visibility === "all" || note.visibility === filters.visibility;
        return matchesAuthor && matchesVisibility;
      });
    }
    return [];
  }, [filters, allNotes, searchResults, isSearchMode]);

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

  function toggleSelectionMode() {
    setSelectionMode((v) => !v);
    setSelectedIds([]);
    setBulkError(null);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(filteredNotes.map((n) => n.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} note${selectedIds.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    setBulkError(null);
    try {
      const result = await bulkDeleteNotes(selectedIds);
      setSelectedIds([]);
      setSelectionMode(false);
      router.refresh();
      alert(`Deleted ${result.deleted} note${result.deleted !== 1 ? "s" : ""}.`);
    } catch (err) {
      setBulkError(getActionError(err, "Bulk delete failed"));
    } finally {
      setBulkDeleting(false);
    }
  }

  // Counter line
  const counterText = (() => {
    if (isSearchMode) {
      if (isSearching) return "Searching…";
      if (searchResults === null) return null;
      return `${filteredNotes.length} result${filteredNotes.length !== 1 ? "s" : ""} across all notes`;
    }
    const loaded = allNotes.length;
    const shown = filteredNotes.length;
    if (loaded < totalNotes) {
      return `${shown} of ${loaded} loaded · ${totalNotes} total`;
    }
    return `${shown} of ${totalNotes} note${totalNotes !== 1 ? "s" : ""}`;
  })();

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
              {isSearching && (
                <svg className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
            {counterText && <p className="text-[12px] text-dim">{counterText}</p>}
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

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ui-btn-secondary px-4 py-2 text-[12px]"
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={toggleSelectionMode}
              className={`ui-btn-secondary px-4 py-2 text-[12px] ${selectionMode ? "text-[var(--accent)] border-[var(--accent-soft)] bg-[var(--accent-soft)]" : ""}`}
            >
              {selectionMode ? "Cancel selection" : "Select"}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectionMode && (
        <div className="bg-surface border border-[var(--border-color)] rounded-card px-5 py-3 shadow-card flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-ink font-medium">
              {selectedIds.length} selected
            </span>
            <button type="button" onClick={selectAll} className="text-[12px] text-[var(--accent)] hover:underline">
              Select all ({filteredNotes.length})
            </button>
            {selectedIds.length > 0 && (
              <button type="button" onClick={clearSelection} className="text-[12px] text-dim hover:text-ink">
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {bulkError && (
              <span className="text-[12px] text-bad">{bulkError}</span>
            )}
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0 || bulkDeleting}
              className="ui-btn-danger px-4 py-1.5 text-[12px] disabled:opacity-50"
            >
              {bulkDeleting ? "Deleting…" : `Delete ${selectedIds.length > 0 ? `(${selectedIds.length})` : ""}`}
            </button>
          </div>
        </div>
      )}

      {filteredNotes.length > 0 || isSearching ? (
        <>
          <NoteList
            notes={filteredNotes}
            currentUserId={currentUserId}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />

          {/* Infinite scroll sentinel — only shown in browse mode */}
          {!isSearchMode && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && (
                <svg className="h-5 w-5 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {!hasMore && allNotes.length > 0 && !loadingMore && (
                <p className="text-[12px] text-muted">All {totalNotes} notes loaded</p>
              )}
            </div>
          )}
        </>
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
