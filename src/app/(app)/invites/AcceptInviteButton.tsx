"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { acceptInvite } from "@/actions/orgs";
import { useState } from "react";

export default function AcceptInviteButton({ token, orgName }: { token: string; orgName: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setLoading(true);
    setError("");
    try {
      const result = await acceptInvite(token);
      await update({ activeOrgId: result.orgId });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0 text-right">
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Joining..." : `Join ${orgName}`}
      </button>
    </div>
  );
}
