"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { acceptInvite, denyInvite } from "@/actions/orgs";
import { useState } from "react";

export default function AcceptInviteButton({
  token,
  inviteId,
  orgName,
}: {
  token: string;
  inviteId: string;
  orgName: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      const result = await acceptInvite(token);
      await update({ activeOrgId: result.orgId });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
      setAccepting(false);
    }
  }

  async function handleDecline() {
    setDeclining(true);
    setError("");
    try {
      await denyInvite(inviteId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline invite");
      setDeclining(false);
    }
  }

  const busy = accepting || declining;

  return (
    <div className="shrink-0 text-right">
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDecline}
          disabled={busy}
          className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {declining ? "..." : "Decline"}
        </button>
        <button
          onClick={handleAccept}
          disabled={busy}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {accepting ? "Joining..." : `Join ${orgName}`}
        </button>
      </div>
    </div>
  );
}
