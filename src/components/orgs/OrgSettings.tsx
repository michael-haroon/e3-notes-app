"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteMember } from "@/actions/orgs";
import { Role } from "@/generated/prisma";

type Member = {
  id: string;
  role: Role;
  joinedAt: Date;
  user: { id: string; name: string | null; email: string };
};

type Invite = {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: Date;
};

type Org = { id: string; name: string; slug: string };

export function OrgSettings({
  org,
  currentRole,
  currentUserId,
  members,
  pendingInvites,
}: {
  org: Org;
  currentRole: Role;
  currentUserId: string;
  members: Member[];
  pendingInvites: Invite[];
}) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>(Role.MEMBER);
  const [inviting, setInviting] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  const canInvite = currentRole === Role.ADMIN || currentRole === Role.OWNER;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError("");
    try {
      const result = await inviteMember(org.id, { email: inviteEmail, role: inviteRole });
      setInviteToken(result.token);
      setInviteEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  const inviteUrl = inviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteToken}`
    : null;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-1">{org.name}</h2>
        <p className="text-sm text-gray-500">
          Slug: <code className="bg-gray-100 px-1 rounded">{org.slug}</code>
        </p>
        <p className="text-sm text-gray-500 mt-1">Your role: <strong>{currentRole}</strong></p>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Members ({members.length})</h3>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">
                  {m.user.name ?? m.user.email}
                  {m.user.id === currentUserId && (
                    <span className="ml-2 text-xs text-gray-400">(you)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{m.user.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                m.role === Role.OWNER ? "bg-yellow-100 text-yellow-700" :
                m.role === Role.ADMIN ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {canInvite && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Invite Member</h3>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {inviteUrl && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium mb-1">Invite link created!</p>
              <code className="text-xs bg-white border rounded px-2 py-1 block overflow-auto">
                {inviteUrl}
              </code>
            </div>
          )}

          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="colleague@example.com"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value={Role.MEMBER}>Member</option>
              <option value={Role.ADMIN}>Admin</option>
              {currentRole === Role.OWNER && <option value={Role.OWNER}>Owner</option>}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {inviting ? "..." : "Invite"}
            </button>
          </form>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Pending Invites</h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm">{inv.email}</p>
                  <p className="text-xs text-gray-400">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {inv.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
