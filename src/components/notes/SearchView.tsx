"use client";

import { useState, useCallback } from "react";
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

export function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=20`
      );
      const data = await res.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      search(query);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Search Notes</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by title, content, or tags..."
            className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => search(query)}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {searched && (
        <p className="text-sm text-gray-500">
          {total} result{total !== 1 ? "s" : ""} for &quot;{query}&quot;
        </p>
      )}

      {results.length > 0 && (
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
                    {note.title}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {note.content.slice(0, 200) || "No content"}
                  </p>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {note.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        >
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
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>No notes found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
