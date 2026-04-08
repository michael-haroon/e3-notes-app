"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Visibility } from "@/generated/prisma/enums";

type SearchResult = {
  id: string; title: string; content: string; visibility: Visibility;
  authorId: string; authorName: string | null; orgId: string;
  createdAt: string; updatedAt: string; tags: string[]; rank: number;
};
type Tag = { id: string; name: string };

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part)
      ? <mark key={i} className="bg-warn-soft text-warn rounded-[2px] px-0.5">{part}</mark>
      : part
  );
}

export function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const [orgTags, setOrgTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 20;

  useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/tags").then((r) => r.json()).then((d) => setOrgTags(d.tags ?? []));
  }, []);

  const doSearch = useCallback(async (q: string, tags: string[], off: number) => {
    if (!q.trim() && tags.length === 0) {
      setResults([]); setSearched(false); setLoading(false); return;
    }
    setLoading(true);
    try {
      const tagParams = tags.map((t) => `&tag=${encodeURIComponent(t)}`).join("");
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${off}${tagParams}`);
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
    debounceRef.current = setTimeout(() => doSearch(q, selectedTags, 0), 400);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setQuery(""); setResults([]); setSearched(false); }
    if (e.key === "Enter") { if (debounceRef.current) clearTimeout(debounceRef.current); doSearch(query, selectedTags, 0); }
  }

  function toggleTag(tagName: string) {
    const next = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setSelectedTags(next);
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, next, 0), 100);
  }

  function loadMore() {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    doSearch(query, selectedTags, newOffset);
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
          onClick={() => doSearch(query, selectedTags, 0)}
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

      {/* Results count */}
      {searched && (
        <p className="text-[12px] text-dim">
          {results.length} of {total} result{total !== 1 ? "s" : ""}
          {query && <> for <span className="text-ink font-medium">&quot;{query}&quot;</span></>}
          {selectedTags.length > 0 && <> · tagged {selectedTags.map((t) => `#${t}`).join(", ")}</>}
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
