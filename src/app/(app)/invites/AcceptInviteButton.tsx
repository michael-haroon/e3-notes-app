"use client";
import { useRouter } from "next/navigation";
import { acceptInvite, denyInvite } from "@/actions/orgs";
import { switchActiveOrg } from "@/actions/session";
import { useState } from "react";

export default function AcceptInviteButton({
  token, inviteId, orgName,
}: { token: string; inviteId: string; orgName: string }) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setAccepting(true); setError("");
    const result = await acceptInvite(token);
    if (!result.success) {
      setError(result.error);
      setAccepting(false);
    } else {
      await switchActiveOrg(result.orgId);
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleDecline() {
    setDeclining(true); setError("");
    const result = await denyInvite(inviteId);
    if (!result.success) {
      setError(result.error);
      setDeclining(false);
    } else {
      router.refresh();
    }
  }

  const busy = accepting || declining;

  return (
    <div className="shrink-0 text-right">
      {error && <p className="text-[11px] text-bad mb-1.5">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleDecline} disabled={busy}
          className="px-3 py-1.5 border border-[var(--border-color)] text-dim text-[12px] font-medium rounded-[7px] hover:bg-subtle disabled:opacity-50 transition-colors">
          {declining ? "…" : "Decline"}
        </button>
        <button onClick={handleAccept} disabled={busy}
          className="px-4 py-1.5 bg-[var(--accent)] text-white text-[12px] font-medium rounded-[7px] hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
          {accepting ? "Joining…" : `Join ${orgName}`}
        </button>
      </div>
    </div>
  );
}
