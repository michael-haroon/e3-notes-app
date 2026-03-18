"use client";

import { useState, useEffect } from "react";

type Version = {
  id: string;
  version: number;
  title: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
};

export function VersionsView({ noteId }: { noteId: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrom, setSelectedFrom] = useState<number | null>(null);
  const [selectedTo, setSelectedTo] = useState<number | null>(null);
  const [diff, setDiff] = useState<{ contentDiff: string; titleDiff: string | null } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/notes/${noteId}/versions`)
      .then((r) => r.json())
      .then((data) => {
        setVersions(data.versions ?? []);
        setLoading(false);
      });
  }, [noteId]);

  async function loadDiff() {
    if (!selectedFrom || !selectedTo) return;
    setDiffLoading(true);
    const res = await fetch(
      `/api/notes/${noteId}/versions?from=${selectedFrom}&to=${selectedTo}`
    );
    const data = await res.json();
    setDiff(data);
    setDiffLoading(false);
  }

  if (loading) return <div className="text-gray-500">Loading versions...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Version History ({versions.length} versions)</h2>

      {versions.length >= 2 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Compare Versions</h3>
          <div className="flex items-center gap-3">
            <select
              value={selectedFrom ?? ""}
              onChange={(e) => setSelectedFrom(parseInt(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">From version...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.version}>
                  v{v.version} — {new Date(v.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
            <span className="text-gray-400">→</span>
            <select
              value={selectedTo ?? ""}
              onChange={(e) => setSelectedTo(parseInt(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">To version...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.version}>
                  v{v.version} — {new Date(v.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
            <button
              onClick={loadDiff}
              disabled={!selectedFrom || !selectedTo || diffLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {diffLoading ? "..." : "Compare"}
            </button>
          </div>

          {diff && (
            <div className="mt-4">
              {diff.titleDiff && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Title diff</p>
                  <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto">
                    {diff.titleDiff}
                  </pre>
                </div>
              )}
              <p className="text-xs font-medium text-gray-500 mb-1">Content diff</p>
              <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
                {diff.contentDiff}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {versions.map((v) => (
          <div key={v.id} className="bg-white border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  v{v.version}
                </span>
                <span className="text-sm text-gray-600">
                  {v.title}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {v.author.name ?? v.author.email} •{" "}
                {new Date(v.createdAt).toLocaleString()}
              </div>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {v.content.slice(0, 200) || "Empty content"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
