"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteNote } from "@/actions/notes";
import { useRouter } from "next/navigation";
import { Visibility } from "@/generated/prisma/enums";
import { FileUploader } from "@/components/notes/FileUploader";
import { SharePanel } from "@/components/notes/SharePanel";

type Note = {
  id: string;
  title: string;
  content: string;
  visibility: Visibility;
  authorId: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; email: string };
  tags: { tag: { id: string; name: string } }[];
  versions: { id: string; version: number; createdAt: Date; author?: { name: string | null; email: string } }[];
  files: { id: string; filename: string; mimeType: string; size: number }[];
  aiSummaries: { id: string; content: string; accepted: boolean; createdAt: Date }[];
  shares: { userId: string; user: { id: string; name: string | null; email: string } }[];
};

const visibilityLabels: Record<string, string> = {
  PUBLIC: "Public",
  ORG: "Org",
  PRIVATE: "Private",
};

export function NoteDetail({
  note,
  canEdit = false,
  canDelete = false,
  isAuthor = false,
  orgMembers = [],
}: {
  note: Note;
  canEdit?: boolean;
  canDelete?: boolean;
  isAuthor?: boolean;
  orgMembers?: { userId: string; user: { id: string; name: string | null; email: string } }[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{
    summary: string;
    keyPoints: string[];
    topics: string[];
  } | null>(null);
  const [summaryId, setSummaryId] = useState<string | null>(null);


  const latestSummary = note.aiSummaries[0];

  async function handleDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteNote(note.id);
      router.push("/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummaryResult(data.summary.data);
      setSummaryId(data.summary.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setSummarizing(false);
    }
  }

  async function handleAcceptSummary(accepted: boolean) {
    if (!summaryId) return;
    await fetch("/api/ai/summarize", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summaryId, accepted }),
    });
    setSummaryResult(null);
    setSummaryId(null);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium truncate">{note.title}</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{note.title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>By {note.author.name ?? note.author.email}</span>
                <span>•</span>
                <span className="capitalize">{visibilityLabels[note.visibility]}</span>
                <span>•</span>
                <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>{note.versions.length} version{note.versions.length !== 1 ? "s" : ""}</span>
              </div>
              {note.tags.length > 0 && (
                <div className="flex gap-1 mt-3 flex-wrap">
                  {note.tags.map(({ tag }) => (
                    <span key={tag.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {canEdit && (
                <Link
                  href={`/notes/${note.id}/edit`}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Edit
                </Link>
              )}
              <Link
                href={`/notes/${note.id}/versions`}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              >
                History
              </Link>
              <button
                onClick={handleSummarize}
                disabled={summarizing}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {summarizing ? "..." : "AI Summary"}
              </button>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                >
                  {deleting ? "..." : "Delete"}
                </button>
              )}
            </div>
          </div>

          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
              {note.content || "No content yet."}
            </pre>
          </div>

          {/* AI Summary result */}
          {summaryResult && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <h3 className="font-semibold text-purple-800 mb-2">AI Summary</h3>
              <p className="text-sm text-gray-700 mb-3">{summaryResult.summary}</p>
              {summaryResult.keyPoints.length > 0 && (
                <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 mb-3">
                  {summaryResult.keyPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              )}
              {summaryResult.topics.length > 0 && (
                <div className="flex gap-1 mb-3">
                  {summaryResult.topics.map((t) => (
                    <span key={t} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptSummary(true)}
                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleAcceptSummary(false)}
                  className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Previously accepted summary */}
          {!summaryResult && latestSummary?.accepted && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <h3 className="font-semibold text-purple-800 mb-2">Accepted AI Summary</h3>
              {(() => {
                try {
                  const parsed = JSON.parse(latestSummary.content) as {
                    summary: string;
                    keyPoints: string[];
                    topics: string[];
                  };
                  return (
                    <>
                      <p className="text-sm text-gray-700 mb-2">{parsed.summary}</p>
                      {parsed.keyPoints.length > 0 && (
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          {parsed.keyPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                        </ul>
                      )}
                    </>
                  );
                } catch {
                  return <p className="text-sm text-gray-700">{latestSummary.content}</p>;
                }
              })()}
            </div>
          )}

          {/* Version History Panel */}
          {note.versions.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Recent Changes</h3>
                <Link href={`/notes/${note.id}/versions`} className="text-xs text-blue-600 hover:underline">
                  View all {note.versions.length} versions →
                </Link>
              </div>
              <div className="space-y-2">
                {note.versions.slice(0, 3).map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">v{v.version}</span>
                      <span className="text-gray-500 text-xs">
                        {v.author ? (v.author.name ?? v.author.email) : "Unknown"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sharing (PRIVATE notes, author only) */}
          {note.visibility === Visibility.PRIVATE && isAuthor && (
            <SharePanel
              noteId={note.id}
              shares={note.shares}
              orgMembers={orgMembers}
            />
          )}

          {/* Files */}
          <div className="mt-6">
            <FileUploader noteId={note.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
