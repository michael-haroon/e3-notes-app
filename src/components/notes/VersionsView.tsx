"use client";

import { useState, useEffect } from "react";
import { DiffViewer } from "./DiffViewer";

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
  const [restoring, setRestoring] = useState<number | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  async function loadVersions() {
    const res = await fetch(`/api/notes/${noteId}/versions`);
    const data = await res.json();
    setVersions(data.versions ?? []);
    setLoading(false);
  }

  useEffect(() => { loadVersions(); }, [noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDiff() {
    if (!selectedFrom || !selectedTo) return;
    setDiffLoading(true);
    const res = await fetch(`/api/notes/${noteId}/versions?from=${selectedFrom}&to=${selectedTo}`);
    const data = await res.json();
    setDiff(data);
    setDiffLoading(false);
  }

  async function handleRestore(version: number) {
    if (!confirm(`Restore note to v${version}? A new version will be created.`)) return;
    setRestoring(version);
    try {
      const res = await fetch(`/api/notes/${noteId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setRestoreMsg(`Restored to v${version} successfully. A new version was created.`);
      await loadVersions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  }

  if (loading) return <div className="text-gray-500">Loading versions...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Version History ({versions.length} versions)</h2>

      {restoreMsg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {restoreMsg}
          <button onClick={() => setRestoreMsg(null)} className="ml-2 text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {versions.length >= 2 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Compare Versions</h3>
          <div className="flex items-center gap-3 flex-wrap">
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
            <div className="mt-4 space-y-3">
              {diff.titleDiff && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Title diff</p>
                  <DiffViewer diff={diff.titleDiff} />
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Content diff</p>
                <DiffViewer diff={diff.contentDiff} />
              </div>
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
                <span className="text-sm text-gray-700 font-medium">{v.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-400 text-right">
                  <span>{v.author.name ?? v.author.email}</span>
                  <span className="mx-1">•</span>
                  <span>{new Date(v.createdAt).toLocaleString()}</span>
                </div>
                <button
                  onClick={() => handleRestore(v.version)}
                  disabled={restoring === v.version}
                  className="text-xs px-3 py-1 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  {restoring === v.version ? "Restoring..." : "Restore"}
                </button>
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
