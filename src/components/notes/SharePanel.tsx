"use client";
import { getActionError } from "@/lib/action-error";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { shareNote, unshareNote } from "@/actions/notes";

type User = { id: string; name: string | null; email: string };
type ShareEntry = { userId: string; user: User };
type OrgMember = { userId: string; user: User };

export function SharePanel({
  noteId,
  shares,
  orgMembers,
}: {
  noteId: string;
  shares: ShareEntry[];
  orgMembers: OrgMember[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sharedIds = new Set(shares.map((s) => s.userId));
  const shareable = orgMembers.filter((m) => !sharedIds.has(m.userId));

  async function handleShare(userId: string) {
    setBusy(userId);
    setError("");
    try {
      await shareNote(noteId, userId);
      router.refresh();
    } catch (err) {
      setError(getActionError(err, "Share failed"));
    } finally {
      setBusy(null);
    }
  }

  async function handleUnshare(userId: string) {
    setBusy(userId);
    setError("");
    try {
      await unshareNote(noteId, userId);
      router.refresh();
    } catch (err) {
      setError(getActionError(err, "Unshare failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 border-t border-[var(--border-color)] pt-6">
      <h3 className="mb-3 text-sm font-semibold text-ink">Shared with</h3>

      {error && (
        <p className="mb-2 rounded-[6px] border border-[var(--red-soft)] bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>
      )}

      {shares.length === 0 && (
        <p className="mb-3 text-sm text-muted">Not shared with anyone yet.</p>
      )}

      <div className="mb-4 space-y-1">
        {shares.map((s) => (
          <div key={s.userId} className="flex items-center justify-between rounded-card border border-[var(--border-color)] bg-canvas px-3 py-1.5 text-sm">
            <span className="text-ink">{s.user.name ?? s.user.email}</span>
            <button
              onClick={() => handleUnshare(s.userId)}
              disabled={busy === s.userId}
              className="text-xs font-medium text-bad hover:opacity-70 disabled:opacity-50"
            >
              {busy === s.userId ? "..." : "Remove"}
            </button>
          </div>
        ))}
      </div>

      {shareable.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-muted">Add access:</p>
          <div className="space-y-1">
            {shareable.map((m) => (
              <div key={m.userId} className="flex items-center justify-between rounded-card border border-[var(--border-color)] bg-canvas px-3 py-1.5 text-sm">
                <span className="text-ink">{m.user.name ?? m.user.email}</span>
                <button
                  onClick={() => handleShare(m.userId)}
                  disabled={busy === m.userId}
                  className="text-xs font-medium text-[var(--accent)] hover:opacity-70 disabled:opacity-50"
                >
                  {busy === m.userId ? "..." : "Share"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
