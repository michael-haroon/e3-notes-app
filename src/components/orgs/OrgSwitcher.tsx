"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const { update } = useSession();
  const router = useRouter();

  async function handleSwitch(orgId: string) {
    await update({ activeOrgId: orgId });
    router.refresh();
  }

  return (
    <select
      value={activeOrgId ?? ""}
      onChange={(e) => handleSwitch(e.target.value)}
      className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {orgs.map((m) => (
        <option key={m.orgId} value={m.orgId}>
          {m.org.name} ({m.role})
        </option>
      ))}
    </select>
  );
}
