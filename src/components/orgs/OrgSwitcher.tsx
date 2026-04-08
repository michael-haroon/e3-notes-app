"use client";

import { useRouter } from "next/navigation";
import { switchActiveOrg } from "@/actions/session";

type OrgMemberWithOrg = {
  orgId: string;
  role: string;
  org: { id: string; name: string; slug: string };
};

export function OrgSwitcher({
  orgs,
  activeOrgId,
}: {
  orgs: OrgMemberWithOrg[];
  activeOrgId: string | undefined;
}) {
  const router = useRouter();

  async function handleSwitch(orgId: string) {
    await switchActiveOrg(orgId);
    router.refresh();
  }

  if (orgs.length === 0) return null;

  return (
    <select
      value={activeOrgId ?? ""}
      onChange={(e) => handleSwitch(e.target.value)}
      className="max-w-[180px] truncate rounded-[7px] border border-[var(--border-color)] bg-surface px-3 py-1.5 text-sm text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
    >
      {orgs.map((m) => (
        <option key={m.orgId} value={m.orgId}>
          {m.org.name}
        </option>
      ))}
    </select>
  );
}
