"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createOrg } from "@/actions/orgs";
import { switchActiveOrg } from "@/actions/session";

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) { setError("Name must be at least 2 characters."); return; }
    setLoading(true);
    setError("");
    const result = await createOrg(name.trim());
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    } else {
      await switchActiveOrg(result.orgId);
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="bg-surface border border-[var(--border-color)] rounded-card shadow-float w-full max-w-md p-8">
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-7 h-7 bg-[var(--accent)] rounded-[7px] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </div>
          <span className="font-display font-semibold text-[15px] text-ink">TeamNotes</span>
        </div>

        <h1 className="font-display text-xl font-semibold text-ink mb-1">Create Organization</h1>
        <p className="text-[13px] text-dim mb-6">Set up a workspace for your team.</p>

        {error && (
          <div className="mb-5 p-3 bg-bad-soft border border-[var(--red-soft)] text-bad rounded-[7px] text-[13px] flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1.5 uppercase tracking-widest">Organization Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
              required
              autoFocus
              className="w-full bg-canvas border border-[var(--border-color)] rounded-[7px] px-4 py-2.5 text-[14px] text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
              placeholder="Acme Inc"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] text-white py-2.5 rounded-[7px] font-semibold text-[13px] hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : "Create organization"}
          </button>
        </form>

        <p className="mt-5 text-[13px] text-center">
          <Link href="/dashboard" className="text-dim hover:text-ink transition-colors">Back to dashboard</Link>
        </p>
      </div>
    </div>
  );
}
