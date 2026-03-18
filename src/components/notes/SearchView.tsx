"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Visibility } from "@/generated/prisma";

type SearchResult = {
  id: string;
  title: string;
  content: string;
  visibility: Visibility;
  authorId: string;
  authorName: string | null;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  rank: number;
};

type Tag = { id: string; name: string };

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part) ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark> : part
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

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setOrgTags(d.tags ?? []));
  }, []);

  const doSearch = useCallback(async (q: string, tags: string[], off: number) => {
    if (!q.trim() && tags.length === 0) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tagParams = tags.map((t) => `&tag=${encodeURIComponent(t)}`).join("");
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${off}${tagParams}`
      );
      const data = await res.json();
      if (off === 0) {
        setResults(data.results ?? []);
      } else {
        setResults((prev) => [...prev, ...(data.results ?? [])]);
      }
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
    debounceRef.current = setTimeout(() => doSearch(q, selectedTags, 0), 500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query, selectedTags, 0);
    }
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
      <div>
        <h2 className="text-xl font-bold mb-4">Search Notes</h2>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search by title, content, or tags… (Esc to clear)"
            className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => doSearch(query, selectedTags, 0)}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {orgTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {orgTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.name)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                selectedTags.includes(tag.name)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      )}

      {searched && (
        <p className="text-sm text-gray-500">
          Showing {results.length} of {total} result{total !== 1 ? "s" : ""}
          {query && <> for &quot;{query}&quot;</>}
          {selectedTags.length > 0 && <> with tag{selectedTags.length > 1 ? "s" : ""} {selectedTags.map((t) => `#${t}`).join(", ")}</>}
        </p>
      )}

      {loading && results.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="space-y-3">
            {results.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="block bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate mb-1">
                      {highlightMatch(note.title, query)}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {highlightMatch(note.content.slice(0, 200) || "No content", query)}
                    </p>
                    {note.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {note.tags.map((t) => (
                          <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${selectedTags.includes(t) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 shrink-0 text-right">
                    <p>{note.authorName ?? "Unknown"}</p>
                    <p>{new Date(note.updatedAt).toLocaleDateString()}</p>
                    <p className="mt-1 capitalize">{note.visibility.toLowerCase()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {results.length < total && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? "Loading..." : `Load more (${total - results.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>No notes found{query && <> for &quot;{query}&quot;</>}</p>
        </div>
      )}
    </div>
  );
}
