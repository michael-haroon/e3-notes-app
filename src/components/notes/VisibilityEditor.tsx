"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateNote, shareNote, unshareNote } from "@/actions/notes";
import { Visibility } from "@/generated/prisma/enums";

const visibilityOptions = [
  { value: Visibility.ORG, label: "Org", desc: "All org members can view" },
  { value: Visibility.PUBLIC, label: "Public", desc: "Anyone can view" },
  { value: Visibility.PRIVATE, label: "Private", desc: "Only you + shared users" },
];

const visibilityColors: Record<Visibility, string> = {
  PUBLIC: "bg-green-100 text-green-700",
  ORG: "bg-blue-100 text-blue-700",
  PRIVATE: "bg-gray-100 text-gray-700",
};

type SharedUser = { userId: string; user: { id: string; name: string | null; email: string } };
type OrgMember = { userId: string; user: { id: string; name: string | null; email: string } };

export function VisibilityEditor({
  noteId,
  currentVisibility,
  authorId,
  currentUserId,
  shares,
  orgMembers,
}: {
  noteId: string;
  currentVisibility: Visibility;
  authorId: string;
  currentUserId: string;
  shares: SharedUser[];
  orgMembers: OrgMember[];
}) {
  const router = useRouter();
  const [visibility, setVisibility] = useState(currentVisibility);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  const isAuthor = authorId === currentUserId;

  async function handleVisibilityChange(v: Visibility) {
    if (!isAuthor) return;
    setSaving(true);
    try {
      await updateNote({ noteId, visibility: v });
      setVisibility(v);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleShare(userId: string) {
    setSharing(userId);
    try {
      await shareNote(noteId, userId);
      router.refresh();
    } finally {
      setSharing(null);
    }
  }

  async function handleUnshare(userId: string) {
    setSharing(userId);
    try {
      await unshareNote(noteId, userId);
      router.refresh();
    } finally {
      setSharing(null);
    }
  }

  const sharedUserIds = new Set(shares.map((s) => s.userId));
  const nonSharedMembers = orgMembers.filter(
    (m) => m.userId !== authorId && !sharedUserIds.has(m.userId)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${visibilityColors[visibility]}`}>
          {visibility}
        </span>
        {isAuthor && (
          <select
            value={visibility}
            onChange={(e) => handleVisibilityChange(e.target.value as Visibility)}
            disabled={saving}
            className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            {visibilityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.desc}
              </option>
            ))}
          </select>
        )}
      </div>

      {visibility === Visibility.PRIVATE && isAuthor && (
        <div className="space-y-2">
          {shares.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Shared with:</p>
              <div className="space-y-1">
                {shares.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between text-xs bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span>{s.user.name ?? s.user.email}</span>
                    <button
                      onClick={() => handleUnshare(s.userId)}
                      disabled={sharing === s.userId}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nonSharedMembers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Add access:</p>
              <div className="space-y-1">
                {nonSharedMembers.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between text-xs bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span>{m.user.name ?? m.user.email}</span>
                    <button
                      onClick={() => handleShare(m.userId)}
                      disabled={sharing === m.userId}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Share
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
