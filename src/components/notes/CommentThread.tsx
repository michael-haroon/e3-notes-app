"use client";
import { getActionError } from "@/lib/action-error";

import { useEffect, useState } from "react";
import { createComment, deleteComment, editComment } from "@/actions/comments";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
};

export function CommentThread({ noteId, currentUserId }: { noteId: string; currentUserId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadComments() {
    try {
      const res = await fetch(`/api/notes/${noteId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {
      // Silently fail; comments section remains empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadComments(); }, [noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createComment(noteId, newComment);
      setNewComment("");
      await loadComments();
    } catch (err) {
      setError(getActionError(err, "Failed to post comment"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    setDeletingId(commentId);
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(getActionError(err, "Failed to delete comment"));
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditContent(comment.content);
  }

  async function handleEditSubmit(e: React.FormEvent, commentId: string) {
    e.preventDefault();
    if (!editContent.trim()) return;
    try {
      await editComment({ commentId, content: editContent });
      setEditingId(null);
      await loadComments();
    } catch (err) {
      alert(getActionError(err, "Failed to update comment"));
    }
  }

  const daysSince = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-surface border border-[var(--border-color)] rounded-card shadow-card">
      <div className="px-5 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
        <h3 className="font-medium text-[13px] text-ink">Comments</h3>
        {comments.length > 0 && (
          <span className="text-[11px] bg-subtle text-dim px-2 py-0.5 rounded-full">{comments.length}</span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton w-7 h-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-1/4" />
                  <div className="skeleton h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-[13px] text-muted text-center py-4">No comments yet. Be the first to comment.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isOwn = comment.author.id === currentUserId;
              const authorName = comment.author.name ?? comment.author.email;
              const initials = authorName.slice(0, 2).toUpperCase();

              return (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-[10px] font-bold shrink-0 border border-[var(--accent-soft)]">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-medium text-ink">{authorName}</span>
                      <span className="text-[11px] text-muted">{daysSince(comment.createdAt)}</span>
                    </div>
                    {editingId === comment.id ? (
                      <form onSubmit={(e) => handleEditSubmit(e, comment.id)} className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          autoFocus
                          className="w-full bg-canvas border border-[var(--border-color)] rounded-[6px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="ui-btn-primary px-3 py-1 text-[12px]">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="ui-btn-secondary px-3 py-1 text-[12px]">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                        {isOwn && (
                          <div className="flex gap-3 mt-1">
                            <button
                              onClick={() => startEdit(comment)}
                              className="text-[11px] text-dim hover:text-ink transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(comment.id)}
                              disabled={deletingId === comment.id}
                              className="text-[11px] text-bad hover:opacity-70 disabled:opacity-40 transition-colors"
                            >
                              {deletingId === comment.id ? "…" : "Delete"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="text-[12px] text-bad bg-bad-soft border border-[var(--red-soft)] rounded-[6px] px-3 py-2">{error}</p>
        )}

        {/* New comment form */}
        <form onSubmit={handleSubmit} className="pt-2 border-t border-[var(--border-color)]">
          <textarea
            value={newComment}
            onChange={(e) => { setNewComment(e.target.value); setError(null); }}
            rows={3}
            placeholder="Add a comment…"
            className="w-full bg-canvas border border-[var(--border-color)] rounded-[6px] px-3 py-2.5 text-[13px] text-ink placeholder-muted focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none transition-colors"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="ui-btn-primary px-4 py-1.5 text-[12px] disabled:opacity-50"
            >
              {submitting ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
