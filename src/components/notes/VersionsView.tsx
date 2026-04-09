"use client";
import { getActionError } from "@/lib/action-error";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFrom, setSelectedFrom] = useState<number | null>(null);
  const [selectedTo, setSelectedTo] = useState<number | null>(null);
  const [diff, setDiff] = useState<{ contentDiff: string; titleDiff: string | null } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restorePreview, setRestorePreview] = useState<{ version: number; diff: { contentDiff: string; titleDiff: string | null } } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<number | null>(null);

  async function loadVersions() {
    setLoadError(null);
    try {
      const res = await fetch(`/api/notes/${noteId}/versions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load versions");
      setVersions(data.versions ?? []);
    } catch (err) {
      setLoadError(getActionError(err, "Failed to load versions"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVersions(); }, [noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDiff() {
    if (!selectedFrom || !selectedTo) return;
    if (selectedFrom === selectedTo) {
      setDiffError("Select two different versions to compare.");
      return;
    }
    setDiffLoading(true);
    setDiff(null);
    setDiffError(null);
    try {
      const res = await fetch(`/api/notes/${noteId}/versions?from=${selectedFrom}&to=${selectedTo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load diff");
      setDiff(data);
    } catch (err) {
      setDiffError(getActionError(err, "Failed to compare versions"));
    } finally {
      setDiffLoading(false);
    }
  }

  async function handleRestoreClick(version: number) {
    // Load a diff between the current (latest) version and the target version for preview
    const latest = versions[0];
    if (!latest || latest.version === version) {
      // Same version — just confirm and restore
      await confirmRestore(version);
      return;
    }
    setPreviewLoading(version);
    try {
      const res = await fetch(`/api/notes/${noteId}/versions?from=${version}&to=${latest.version}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load preview");
      setRestorePreview({ version, diff: data });
    } catch {
      // If preview fails, fall back to plain confirm
      await confirmRestore(version);
    } finally {
      setPreviewLoading(null);
    }
  }

  async function confirmRestore(version: number) {
    setRestorePreview(null);
    setRestoring(version);
    try {
      const res = await fetch(`/api/notes/${noteId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Restore failed");
      }
      setRestoreMsg(`Restored to v${version}. A new version was created.`);
      await loadVersions();
    } catch (err) {
      setLoadError(getActionError(err, "Restore failed"));
    } finally {
      setRestoring(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface border border-[var(--border-color)] rounded-card p-5">
            <div className="skeleton h-4 w-1/3 mb-2.5" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-bad-soft border border-[var(--red-soft)] text-bad rounded-card p-4 flex items-start gap-2 text-[13px]">
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <span className="flex-1">{loadError}</span>
        <button onClick={loadVersions} className="text-[var(--accent)] hover:underline text-[12px] shrink-0">Retry</button>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="bg-surface border border-[var(--border-color)] rounded-card p-10 text-center shadow-card">
        <p className="text-dim text-[13px]">No versions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Restore preview modal */}
      {restorePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface border border-[var(--border-color)] rounded-card shadow-card w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h2 className="font-display text-[15px] font-semibold text-ink">
                Preview restore to v{restorePreview.version}
              </h2>
              <button onClick={() => setRestorePreview(null)} className="text-muted hover:text-ink text-lg leading-none">×</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <p className="text-[13px] text-dim">Differences between v{restorePreview.version} (target) and current version:</p>
              {restorePreview.diff.titleDiff && (
                <div>
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">Title</p>
                  <DiffViewer diff={restorePreview.diff.titleDiff} />
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">Content</p>
                <DiffViewer diff={restorePreview.diff.contentDiff} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[var(--border-color)] flex gap-2 justify-end">
              <button onClick={() => setRestorePreview(null)} className="ui-btn-secondary px-4 py-2 text-[13px]">
                Cancel
              </button>
              <button
                onClick={() => confirmRestore(restorePreview.version)}
                disabled={!!restoring}
                className="ui-btn-primary px-4 py-2 text-[13px] disabled:opacity-50"
              >
                {restoring ? "Restoring…" : `Restore to v${restorePreview.version}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {restoreMsg && (
        <div className="bg-ok-soft border border-[var(--green-soft)] text-ok rounded-card p-3.5 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {restoreMsg}
          </div>
          <button onClick={() => setRestoreMsg(null)} className="text-ok hover:opacity-70 text-lg leading-none ml-3">×</button>
        </div>
      )}

      {/* Compare panel */}
      {versions.length >= 2 && (
        <div className="bg-surface border border-[var(--border-color)] rounded-card p-5 shadow-card">
          <h3 className="font-medium text-[13px] text-ink mb-3">Compare Versions</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedFrom ?? ""}
              onChange={(e) => { setSelectedFrom(parseInt(e.target.value)); setDiff(null); setDiffError(null); }}
              className="bg-canvas border border-[var(--border-color)] rounded-[7px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">From…</option>
              {versions.map((v) => (
                <option key={v.id} value={v.version}>v{v.version} — {new Date(v.createdAt).toLocaleDateString()}</option>
              ))}
            </select>
            <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <select
              value={selectedTo ?? ""}
              onChange={(e) => { setSelectedTo(parseInt(e.target.value)); setDiff(null); setDiffError(null); }}
              className="bg-canvas border border-[var(--border-color)] rounded-[7px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">To…</option>
              {versions.map((v) => (
                <option key={v.id} value={v.version}>v{v.version} — {new Date(v.createdAt).toLocaleDateString()}</option>
              ))}
            </select>
            <button
              onClick={loadDiff}
              disabled={!selectedFrom || !selectedTo || diffLoading}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-[7px] text-[12px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {diffLoading ? "Comparing…" : "Compare"}
            </button>
          </div>

          {diffError && (
            <p className="mt-2.5 text-[12px] text-bad bg-bad-soft px-3 py-2 rounded-[6px]">{diffError}</p>
          )}

          {diff && (
            <div className="mt-4 space-y-3 pt-4 border-t border-[var(--border-color)]">
              {diff.titleDiff && (
                <div>
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">Title</p>
                  <DiffViewer diff={diff.titleDiff} />
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">Content</p>
                <DiffViewer diff={diff.contentDiff} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Version list */}
      <div className="space-y-2.5">
        {versions.map((v) => (
          <div key={v.id} className="bg-surface border border-[var(--border-color)] rounded-card p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-[11px] font-semibold bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 rounded-[4px]">
                  v{v.version}
                </span>
                <span className="text-[13px] font-medium text-ink">{v.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-[11px] text-muted text-right">
                  <span>{v.author.name ?? v.author.email}</span>
                  <span className="mx-1">·</span>
                  <span>{new Date(v.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <button
                  onClick={() => handleRestoreClick(v.version)}
                  disabled={!!restoring || previewLoading === v.version}
                  className="text-[11px] px-2.5 py-1 border border-[var(--border-color)] text-dim rounded-[6px] hover:bg-subtle hover:text-ink disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {restoring === v.version || previewLoading === v.version ? "Loading…" : "Restore"}
                </button>
              </div>
            </div>
            {v.content && (
              <p className="text-[12px] text-dim mt-2.5 line-clamp-2 font-mono leading-relaxed">
                {v.content}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
