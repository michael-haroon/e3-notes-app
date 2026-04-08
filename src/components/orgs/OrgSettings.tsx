"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { inviteMember, leaveOrg, deleteOrg, removeMember } from "@/actions/orgs";
import { Role } from "@/generated/prisma/enums";

type Member = {
  id: string; role: Role; joinedAt: Date;
  user: { id: string; name: string | null; email: string };
};
type Invite = { id: string; email: string; role: Role; token: string; expiresAt: Date };
type Org = { id: string; name: string; slug: string };

function canCallerRemove(callerRole: Role, callerUserId: string, targetUserId: string, targetRole: Role): boolean {
  if (callerUserId === targetUserId) return false;
  if (callerRole === Role.OWNER) return true;
  if (callerRole === Role.ADMIN) return targetRole === Role.MEMBER;
  return false;
}

const rolePill: Record<Role, string> = {
  [Role.OWNER]: "bg-warn-soft text-warn",
  [Role.ADMIN]: "bg-[var(--accent-soft)] text-[var(--accent)]",
  [Role.MEMBER]: "bg-subtle text-muted",
};
const roleLabel: Record<Role, string> = { [Role.OWNER]: "Owner", [Role.ADMIN]: "Admin", [Role.MEMBER]: "Member" };

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-[var(--border-color)] rounded-card shadow-card overflow-hidden">
      {children}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="px-5 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
      <h3 className="font-semibold text-[13px] text-ink">{title}</h3>
      {count !== undefined && (
        <span className="text-[11px] font-medium bg-subtle text-dim px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mx-5 mt-4 p-3 bg-bad-soft border border-[var(--red-soft)] text-bad rounded-[7px] text-[13px] flex items-start gap-2">
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      {message}
    </div>
  );
}

export function OrgSettings({
  org, currentRole, currentUserId, members, pendingInvites,
}: {
  org: Org; currentRole: Role; currentUserId: string;
  members: Member[]; pendingInvites: Invite[];
}) {
  const router = useRouter();
  const { update } = useSession();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>(Role.MEMBER);
  const [inviting, setInviting] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dangerError, setDangerError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  const canInvite = currentRole === Role.ADMIN || currentRole === Role.OWNER;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true); setError(""); setInviteToken(null);
    try {
      const result = await inviteMember(org.id, { email: inviteEmail, role: inviteRole });
      setInviteToken(result.token);
      setInviteEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed.");
    } finally { setInviting(false); }
  }

  async function handleRemoveMember(targetUserId: string, targetName: string) {
    if (!confirm(`Remove ${targetName} from ${org.name}?`)) return;
    setRemovingId(targetUserId); setRemoveError("");
    try { await removeMember(org.id, targetUserId); router.refresh(); }
    catch (err) { setRemoveError(err instanceof Error ? err.message : "Failed to remove member."); }
    finally { setRemovingId(null); }
  }

  async function handleLeave() {
    if (!confirm(`Leave ${org.name}?`)) return;
    setLeaving(true); setDangerError("");
    try { await leaveOrg(org.id); await update({}); router.push("/dashboard"); router.refresh(); }
    catch (err) { setDangerError(err instanceof Error ? err.message : "Failed to leave."); setLeaving(false); }
  }

  async function handleDelete() {
    const confirmation = prompt(`Type "${org.name}" to confirm deletion:`);
    if (confirmation !== org.name) { if (confirmation !== null) alert("Name did not match."); return; }
    setDeleting(true); setDangerError("");
    try { await deleteOrg(org.id); await update({}); router.push("/dashboard"); router.refresh(); }
    catch (err) { setDangerError(err instanceof Error ? err.message : "Failed to delete."); setDeleting(false); }
  }

  const inviteUrl = inviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteToken}`
    : null;

  return (
    <div className="space-y-5">
      {/* Org info */}
      <SectionCard>
        <div className="px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{org.name}</h2>
            <p className="text-[12px] text-dim mt-1">
              Slug: <code className="bg-subtle text-ink px-1.5 py-0.5 rounded-[4px] font-mono text-[11px]">{org.slug}</code>
            </p>
          </div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${rolePill[currentRole]}`}>
            {roleLabel[currentRole]}
          </span>
        </div>
      </SectionCard>

      {/* Members */}
      <SectionCard>
        <SectionHeader title="Members" count={members.length} />
        {removeError && <ErrorBanner message={removeError} />}
        <div className="divide-y divide-[var(--border-color)]">
          {members.map((m) => {
            const showRemove = canCallerRemove(currentRole, currentUserId, m.user.id, m.role);
            return (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-[11px] font-bold shrink-0">
                    {(m.user.name ?? m.user.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {m.user.name ?? m.user.email}
                      {m.user.id === currentUserId && (
                        <span className="ml-1.5 text-[11px] text-muted font-normal">(you)</span>
                      )}
                    </p>
                    {m.user.name && (
                      <p className="text-[11px] text-muted truncate">{m.user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${rolePill[m.role]}`}>
                    {roleLabel[m.role]}
                  </span>
                  {showRemove && (
                    <button
                      onClick={() => handleRemoveMember(m.user.id, m.user.name ?? m.user.email)}
                      disabled={removingId === m.user.id}
                      className="text-[12px] text-bad hover:opacity-80 disabled:opacity-40 px-2 py-1 rounded-[5px] hover:bg-bad-soft transition-colors"
                    >
                      {removingId === m.user.id ? "…" : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Invite */}
      {canInvite && (
        <SectionCard>
          <SectionHeader title="Invite Member" />
          <div className="px-5 py-4">
            {error && <ErrorBanner message={error} />}

            {inviteUrl && (
              <div className="mb-4 mt-2 p-3.5 bg-ok-soft border border-[var(--green-soft)] rounded-[7px]">
                <p className="text-[12px] font-medium text-ok mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Invite created — share this link
                </p>
                <code className="text-[11px] bg-surface border border-[var(--border-color)] rounded-[5px] px-3 py-1.5 block overflow-auto text-dim font-mono break-all">
                  {inviteUrl}
                </code>
              </div>
            )}

            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2.5 mt-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setError(""); }}
                required
                placeholder="colleague@example.com"
                className="flex-1 bg-canvas border border-[var(--border-color)] rounded-[7px] px-3.5 py-2 text-[13px] text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="bg-canvas border border-[var(--border-color)] rounded-[7px] px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              >
                <option value={Role.MEMBER}>Member</option>
                <option value={Role.ADMIN}>Admin</option>
                {currentRole === Role.OWNER && <option value={Role.OWNER}>Owner</option>}
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-[7px] text-[13px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {inviting ? "Sending…" : "Send Invite"}
              </button>
            </form>
          </div>
        </SectionCard>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <SectionCard>
          <SectionHeader title="Pending Invites" count={pendingInvites.length} />
          <div className="divide-y divide-[var(--border-color)]">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-[13px] text-ink">{inv.email}</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Expires {new Date(inv.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${rolePill[inv.role]}`}>
                  {roleLabel[inv.role]}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Danger zone */}
      <div className="bg-surface border border-[var(--red-soft)] rounded-card shadow-card p-5">
        <h3 className="font-semibold text-[13px] text-bad mb-0.5">Danger Zone</h3>
        <p className="text-[12px] text-dim mb-4">These actions cannot be undone.</p>
        {dangerError && <ErrorBanner message={dangerError} />}
        <div className="flex gap-2.5 flex-wrap mt-2">
          <button
            onClick={handleLeave}
            disabled={leaving || deleting}
            className="px-4 py-2 border border-[var(--red-soft)] text-bad text-[13px] font-medium rounded-[7px] hover:bg-bad-soft disabled:opacity-50 transition-colors"
          >
            {leaving ? "Leaving…" : "Leave org"}
          </button>
          {currentRole === Role.OWNER && (
            <button
              onClick={handleDelete}
              disabled={deleting || leaving}
              className="px-4 py-2 bg-bad text-white text-[13px] font-medium rounded-[7px] hover:opacity-80 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Deleting…" : "Delete org"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
