"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Visibility } from "@/generated/prisma/enums";
import { splitHighlightedText } from "@/lib/search-highlight";

type SearchResult = {
  id: string; title: string; content: string; visibility: Visibility;
  authorId: string; authorName: string | null; orgId: string;
  createdAt: string; updatedAt: string; tags: string[]; rank: number;
};
type Tag = { id: string; name: string };
type AuthorOption = { id: string; label: string };

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = splitHighlightedText(text, query);
  const matcher = new RegExp(
    `^(?:${query.trim().split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`,
    "i"
  );
  return parts.map((part, i) =>
    matcher.test(part)
      ? <mark key={i} className="bg-warn-soft text-warn rounded-[2px] px-0.5">{part}</mark>
      : part
  );
}

const visibilityOptions = [
  { value: Visibility.ORG, label: "Org" },
  { value: Visibility.PRIVATE, label: "Private" },
];

export function SearchView({ authors }: { authors: AuthorOption[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const [orgTags, setOrgTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedVisibilities, setSelectedVisibilities] = useState<Visibility[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 20;

  useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/tags").then((r) => r.json()).then((d) => setOrgTags(d.tags ?? []));
  }, []);

  const doSearch = useCallback(async (
    q: string,
    tags: string[],
    visibilities: Visibility[],
    authorId: string,
    off: number
  ) => {
    if (!q.trim() && tags.length === 0 && visibilities.length === 0 && !authorId) {
      setResults([]); setSearched(false); setLoading(false); return;
    }
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({
        q,
        limit: String(LIMIT),
        offset: String(off),
      });
      for (const tag of tags) searchParams.append("tag", tag);
      for (const visibility of visibilities) searchParams.append("visibility", visibility);
      if (authorId) searchParams.append("authorId", authorId);

      const res = await fetch(`/api/search?${searchParams.toString()}`);
      const data = await res.json();
      if (off === 0) setResults(data.results ?? []);
      else setResults((prev) => [...prev, ...(data.results ?? [])]);
      setTotal(data.total ?? 0);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q, selectedTags, selectedVisibilities, selectedAuthorId, 0), 400);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setQuery(""); setResults([]); setSearched(false); }
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query, selectedTags, selectedVisibilities, selectedAuthorId, 0);
    }
  }

  function toggleTag(tagName: string) {
    const next = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setSelectedTags(next);
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, next, selectedVisibilities, selectedAuthorId, 0), 100);
  }

  function toggleVisibility(visibility: Visibility) {
    const next = selectedVisibilities.includes(visibility)
      ? selectedVisibilities.filter((value) => value !== visibility)
      : [...selectedVisibilities, visibility];
    setSelectedVisibilities(next);
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, selectedTags, next, selectedAuthorId, 0), 100);
  }

  function handleAuthorChange(authorId: string) {
    setSelectedAuthorId(authorId);
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, selectedTags, selectedVisibilities, authorId, 0), 100);
  }

  function loadMore() {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    doSearch(query, selectedTags, selectedVisibilities, selectedAuthorId, newOffset);
  }

  return (
    <div className="space-y-5">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search notes… (Enter to search, Esc to clear)"
            className="w-full bg-surface border border-[var(--border-color)] rounded-card pl-10 pr-4 py-2.5 text-[14px] text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
          />
        </div>
        <button
          onClick={() => doSearch(query, selectedTags, selectedVisibilities, selectedAuthorId, 0)}
          disabled={loading}
          className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-card text-[13px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loading ? "…" : "Search"}
        </button>
      </div>

      {/* Tag filters */}
      {orgTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {orgTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.name)}
              className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                selectedTags.includes(tag.name)
                  ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                  : "bg-surface text-dim border-[var(--border-color)] hover:border-[var(--accent)]"
              }`}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-card border border-[var(--border-color)] bg-surface p-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Visibility</p>
          <div className="flex flex-wrap gap-1.5">
            {visibilityOptions.map((option) => {
              const active = selectedVisibilities.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleVisibility(option.value)}
                  className={`text-[12px] px-3 py-1 rounded-full border transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-soft)]"
                      : "bg-surface text-dim border-[var(--border-color)] hover:border-[var(--accent)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 md:w-64">
          <label htmlFor="search-author-filter" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Author
          </label>
          <select
            id="search-author-filter"
            value={selectedAuthorId}
            onChange={(e) => handleAuthorChange(e.target.value)}
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
      </div>

      {/* Results count */}
      {searched && (
        <p className="text-[12px] text-dim">
          {results.length} of {total} result{total !== 1 ? "s" : ""}
          {query && <> for <span className="text-ink font-medium">&quot;{query}&quot;</span></>}
          {selectedTags.length > 0 && <> · tagged {selectedTags.map((t) => `#${t}`).join(", ")}</>}
          {selectedVisibilities.length > 0 && <> · {selectedVisibilities.map((value) => value.toLowerCase()).join(", ")}</>}
          {selectedAuthorId && (
            <>
              {" "}· by{" "}
              <span className="text-ink font-medium">
                {authors.find((author) => author.id === selectedAuthorId)?.label ?? "selected author"}
              </span>
            </>
          )}
        </p>
      )}

      {/* Skeleton loading */}
      {loading && results.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-[var(--border-color)] rounded-card p-5">
              <div className="skeleton h-4 w-1/2 mb-2.5" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="space-y-2">
            {results.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="group flex items-start gap-4 bg-surface border border-[var(--border-color)] rounded-card px-5 py-4 hover:shadow-card hover:border-[var(--border-strong)] transition-all"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-ink text-[14px] truncate mb-1 group-hover:text-[var(--accent)] transition-colors">
                    {highlightMatch(note.title, query)}
                  </h3>
                  <p className="text-[13px] text-dim line-clamp-1">
                    {highlightMatch(note.content.slice(0, 200) || "No content", query)}
                  </p>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {note.tags.map((t) => (
                        <span key={t} className={`text-[11px] px-2 py-0.5 rounded-full ${selectedTags.includes(t) ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-subtle text-dim"}`}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-[12px] text-muted shrink-0 text-right space-y-0.5">
                  <p className="text-dim">{note.authorName ?? "Unknown"}</p>
                  <p>{new Date(note.updatedAt).toLocaleDateString()}</p>
                  <p className="capitalize text-[11px]">{note.visibility.toLowerCase()}</p>
                </div>
              </Link>
            ))}
          </div>

          {results.length < total && (
            <div className="text-center pt-2">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-5 py-2 border border-[var(--border-color)] text-dim text-[13px] rounded-card hover:bg-subtle disabled:opacity-50 transition-colors"
              >
                {loading ? "Loading…" : `Load more (${total - results.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-14 text-dim">
          <p className="text-[14px] font-medium text-ink mb-1">No results found</p>
          <p className="text-[13px]">
            {query ? `No notes match "${query}"` : "Try searching for something"}
          </p>
        </div>
      )}
    </div>
  );
}
