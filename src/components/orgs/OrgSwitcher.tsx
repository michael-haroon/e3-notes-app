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
      className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors max-w-[180px] truncate"
    >
      {orgs.map((m) => (
        <option key={m.orgId} value={m.orgId}>
          {m.org.name}
        </option>
      ))}
    </select>
  );
}
