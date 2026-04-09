"use client";
import { getActionError } from "@/lib/action-error";

import { useState } from "react";
import Link from "next/link";
import { deleteNote, pinNote, unpinNote } from "@/actions/notes";
import { useRouter } from "next/navigation";
import { Visibility } from "@/generated/prisma/enums";
import { FileUploader } from "@/components/notes/FileUploader";
import { SharePanel } from "@/components/notes/SharePanel";
import { CommentThread } from "@/components/notes/CommentThread";

type Note = {
  id: string;
  title: string;
  content: string;
  visibility: Visibility;
  authorId: string;
  orgId: string;
  pinnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; email: string };
  tags: { tag: { id: string; name: string } }[];
  versions: { id: string; version: number; createdAt: Date; author?: { name: string | null; email: string } }[];
  files: { id: string; filename: string; mimeType: string; size: number }[];
  aiSummaries: { id: string; content: string; accepted: boolean; createdAt: Date }[];
  shares: { userId: string; user: { id: string; name: string | null; email: string } }[];
};

const visTag: Record<string, string> = {
  PUBLIC:  "bg-ok-soft text-ok",
  ORG:     "bg-[var(--accent-soft)] text-[var(--accent)]",
  PRIVATE: "bg-subtle text-muted",
};
const visLabel: Record<string, string> = { PUBLIC: "Public", ORG: "Org", PRIVATE: "Private" };

/** Render note content with inline image detection and @mention highlighting */
function NoteContent({ content, orgMembers }: {
  content: string;
  orgMembers: { user: { name: string | null; email: string } }[];
}) {
  if (!content) {
    return <span className="text-muted italic">No content yet.</span>;
  }

  const memberNames = orgMembers
    .map((m) => m.user.name ?? m.user.email.split("@")[0])
    .filter(Boolean);

  // Split content into lines, then process each line
  const lines = content.split("\n");

  return (
    <>
      {lines.map((line, lineIdx) => {
        // Check if line is a standalone image URL
        const imageUrlMatch = line.trim().match(/^(https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|svg))$/i);
        if (imageUrlMatch) {
          return (
            <span key={lineIdx} className="block my-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrlMatch[1]}
                alt="Inline image"
                className="max-w-full max-h-80 rounded-[6px] border border-[var(--border-color)]"
                onError={(e) => {
                  // Fall back to showing the URL as text
                  const span = document.createElement("span");
                  span.textContent = line;
                  span.className = "text-[var(--accent)] underline";
                  (e.target as HTMLImageElement).replaceWith(span);
                }}
              />
            </span>
          );
        }

        // Process @mentions inline
        if (memberNames.length === 0 || !line.includes("@")) {
          return (
            <span key={lineIdx}>
              {line}
              {lineIdx < lines.length - 1 && "\n"}
            </span>
          );
        }

        const parts: React.ReactNode[] = [];
        let remaining = line;
        let partIdx = 0;

        for (const name of memberNames) {
          const mentionIdx = remaining.toLowerCase().indexOf(`@${name.toLowerCase()}`);
          if (mentionIdx === -1) continue;
          if (mentionIdx > 0) parts.push(<span key={`${lineIdx}-pre-${partIdx++}`}>{remaining.slice(0, mentionIdx)}</span>);
          parts.push(
            <span key={`${lineIdx}-mention-${partIdx++}`} className="inline-flex items-center gap-0.5 bg-[var(--accent-soft)] text-[var(--accent)] px-1 py-0.5 rounded-[4px] text-[13px] font-medium">
              @{name}
            </span>
          );
          remaining = remaining.slice(mentionIdx + name.length + 1);
        }
        if (remaining) parts.push(<span key={`${lineIdx}-rest-${partIdx++}`}>{remaining}</span>);

        return (
          <span key={lineIdx}>
            {parts.length > 0 ? parts : line}
            {lineIdx < lines.length - 1 && "\n"}
          </span>
        );
      })}
    </>
  );
}

export function NoteDetail({
  note,
  canEdit = false,
  canDelete = false,
  isAuthor = false,
  orgMembers = [],
  currentUserId,
}: {
  note: Note;
  canEdit?: boolean;
  canDelete?: boolean;
  isAuthor?: boolean;
  orgMembers?: { userId: string; user: { id: string; name: string | null; email: string } }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{
    summary: string; keyPoints: string[]; topics: string[];
  } | null>(null);
  const [summaryId, setSummaryId] = useState<string | null>(null);

  const latestSummary = note.aiSummaries[0];
  const isPinned = !!note.pinnedAt;

  async function handleDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteNote(note.id);
      router.push("/dashboard");
    } catch (err) {
      alert(getActionError(err, "Delete failed"));
      setDeleting(false);
    }
  }

  async function handlePin() {
    setPinning(true);
    try {
      if (isPinned) {
        await unpinNote(note.id);
      } else {
        await pinNote(note.id);
      }
      router.refresh();
    } catch (err) {
      alert(getActionError(err, "Failed to update pin"));
    } finally {
      setPinning(false);
    }
  }

  function handleExport() {
    window.location.href = `/api/notes/${note.id}/export`;
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
      alert(getActionError(err, "Failed to generate summary"));
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

  const daysSince = Math.floor((Date.now() - new Date(note.updatedAt).getTime()) / 86_400_000);
  const dateLabel =
    daysSince === 0 ? "Today" :
    daysSince === 1 ? "Yesterday" :
    new Date(note.updatedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-dim mb-6">
        <Link href="/dashboard" className="hover:text-ink transition-colors">Notes</Link>
        <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-ink truncate max-w-[200px]">{note.title}</span>
      </div>

      {/* Header */}
      <div className="mb-7">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="font-display text-[28px] font-semibold text-ink leading-tight tracking-tight flex-1">
            {isPinned && (
              <span className="inline-block mr-2 text-[var(--accent)]" title="Pinned">
                <svg className="w-5 h-5 inline-block -mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              </span>
            )}
            {note.title}
          </h1>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {canEdit && (
              <Link
                href={`/notes/${note.id}/edit`}
                className="ui-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                </svg>
                Edit
              </Link>
            )}
            <button
              onClick={handlePin}
              disabled={pinning}
              title={isPinned ? "Unpin note" : "Pin note"}
              className={`ui-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[12px] ${isPinned ? "text-[var(--accent)] border-[var(--accent-soft)] bg-[var(--accent-soft)]" : ""}`}
            >
              <svg className="w-3.5 h-3.5" fill={isPinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
              {pinning ? "…" : isPinned ? "Pinned" : "Pin"}
            </button>
            <Link
              href={`/notes/${note.id}/versions`}
              className="ui-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </Link>
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="ui-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {summarizing ? "Thinking…" : "AI Summary"}
            </button>
            <button
              onClick={handleExport}
              className="ui-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
              title="Export as Markdown"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="ui-btn-danger px-3 py-1.5 text-[12px]"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 flex-wrap text-[12px] text-dim">
          <span data-testid="note-detail-visibility" className={`px-1.5 py-0.5 rounded-[4px] font-medium text-[11px] ${visTag[note.visibility]}`}>
            {visLabel[note.visibility]}
          </span>
          <span>by <span className="text-ink font-medium">{note.author.name ?? note.author.email}</span></span>
          <span className="text-muted">·</span>
          <span>{dateLabel}</span>
          {note.versions.length > 0 && (
            <>
              <span className="text-muted">·</span>
              <span>{note.versions.length}v</span>
            </>
          )}
        </div>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {note.tags.map(({ tag }) => (
              <span key={tag.id} className="text-[11px] bg-subtle text-dim px-2 py-0.5 rounded-full">
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-surface border border-[var(--border-color)] rounded-card px-7 py-6 shadow-card mb-5">
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Body</span>
          <span className="text-[11px] text-muted">
            {note.content.trim() ? `${note.content.trim().split(/\s+/).length} words` : "Empty"}
          </span>
        </div>
        <pre className="whitespace-pre-wrap font-sans text-[14px] text-ink leading-[1.75]">
          <NoteContent content={note.content} orgMembers={orgMembers} />
        </pre>
      </div>

      {/* AI Summary — new result */}
      {summaryResult && (
        <div className="bg-surface border border-[var(--border-color)] rounded-card p-5 mb-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <h3 className="font-medium text-[13px] text-ink">AI Summary</h3>
          </div>
          <p className="text-[13px] text-dim leading-relaxed mb-3">{summaryResult.summary}</p>
          {summaryResult.keyPoints.length > 0 && (
            <ul className="space-y-1 mb-3">
              {summaryResult.keyPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[13px] text-dim">
                  <span className="text-[var(--accent)] mt-0.5 shrink-0">›</span>{pt}
                </li>
              ))}
            </ul>
          )}
          {summaryResult.topics.length > 0 && (
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {summaryResult.topics.map((t) => (
                <span key={t} className="text-[11px] bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => handleAcceptSummary(true)} className="ui-btn-primary px-3 py-1.5 text-[12px]">
              Accept
            </button>
            <button onClick={() => handleAcceptSummary(false)} className="ui-btn-secondary px-3 py-1.5 text-[12px]">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Accepted summary */}
      {!summaryResult && latestSummary?.accepted && (
        <div className="bg-[var(--accent-soft)] border border-[var(--accent-soft)] rounded-card p-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-medium text-[13px] text-[var(--accent)]">Accepted AI Summary</h3>
          </div>
          {(() => {
            try {
              const parsed = JSON.parse(latestSummary.content) as { summary: string; keyPoints: string[] };
              return (
                <>
                  <p className="text-[13px] text-ink leading-relaxed mb-2">{parsed.summary}</p>
                  {parsed.keyPoints?.length > 0 && (
                    <ul className="space-y-1">
                      {parsed.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[13px] text-dim">
                          <span className="text-[var(--accent)] mt-0.5 shrink-0">›</span>{pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              );
            } catch {
              return <p className="text-[13px] text-ink">{latestSummary.content}</p>;
            }
          })()}
        </div>
      )}

      {/* Version history preview */}
      {note.versions.length > 0 && (
        <div className="bg-surface border border-[var(--border-color)] rounded-card p-5 mb-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-[13px] text-ink">Version History</h3>
            <Link href={`/notes/${note.id}/versions`} className="text-[12px] text-[var(--accent)] hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[var(--border-color)]">
            {note.versions.slice(0, 3).map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] bg-[var(--accent-soft)] text-[var(--accent)] px-1.5 py-0.5 rounded-[4px] font-semibold">
                    v{v.version}
                  </span>
                  <span className="text-[12px] text-dim">{v.author ? (v.author.name ?? v.author.email) : "Unknown"}</span>
                </div>
                <span className="text-[11px] text-muted">
                  {new Date(v.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share panel */}
      {note.visibility === Visibility.PRIVATE && isAuthor && (
        <div className="mb-5">
          <SharePanel noteId={note.id} shares={note.shares} orgMembers={orgMembers} />
        </div>
      )}

      {/* Files */}
      <div className="mb-5">
        <FileUploader noteId={note.id} />
      </div>

      {/* Comments */}
      <CommentThread noteId={note.id} currentUserId={currentUserId} />
    </div>
  );
}
