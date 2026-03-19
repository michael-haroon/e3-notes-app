"use client";

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
      setError(err instanceof Error ? err.message : "Share failed");
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
      setError(err instanceof Error ? err.message : "Unshare failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="font-semibold mb-3 text-sm">Shared with</h3>

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {shares.length === 0 && (
        <p className="text-sm text-gray-400 mb-3">Not shared with anyone yet.</p>
      )}

      <div className="space-y-1 mb-4">
        {shares.map((s) => (
          <div key={s.userId} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-1.5 rounded-lg">
            <span className="text-gray-700">{s.user.name ?? s.user.email}</span>
            <button
              onClick={() => handleUnshare(s.userId)}
              disabled={busy === s.userId}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {busy === s.userId ? "..." : "Remove"}
            </button>
          </div>
        ))}
      </div>

      {shareable.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Add access:</p>
          <div className="space-y-1">
            {shareable.map((m) => (
              <div key={m.userId} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-1.5 rounded-lg">
                <span className="text-gray-700">{m.user.name ?? m.user.email}</span>
                <button
                  onClick={() => handleShare(m.userId)}
                  disabled={busy === m.userId}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
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
