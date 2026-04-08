"use client";

import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
import { switchActiveOrg } from "@/actions/session";

type Org = {
  orgId: string;
  role: string;
  org: { id: string; name: string; slug: string };
};

/* ── Icons ─────────────────────────────────────────────── */

function IconNotes() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}
function IconOrg() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconAudit() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

/* ── NavLink ───────────────────────────────────────────── */

function NavLink({
  href,
  label,
  icon,
  badge,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "text-dim hover:text-ink hover:bg-subtle"
      }`}
    >
      <span className={active ? "text-[var(--accent)]" : "text-muted"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="bg-[var(--accent)] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

/* ── AppShell ──────────────────────────────────────────── */

export function AppShell({
  orgs,
  activeOrgId,
  userName,
  userEmail,
  userInitials,
  pendingInvites,
  isAdmin,
  hasOrg,
  children,
}: {
  orgs: Org[];
  activeOrgId: string | undefined;
  userName: string;
  userEmail: string | null | undefined;
  userInitials: string;
  pendingInvites: number;
  isAdmin: boolean;
  hasOrg: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [switchingOrg, setSwitchingOrg] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleOrgSwitch(orgId: string) {
    if (!orgId || orgId === activeOrgId) return;
    setSwitchingOrg(true);
    try {
      await switchActiveOrg(orgId);
      router.refresh();
    } finally {
      setSwitchingOrg(false);
    }
  }

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[var(--accent)] rounded-[7px] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </div>
          <span className="font-display font-semibold text-[15px] text-ink tracking-tight">TeamNotes</span>
        </div>
      </div>

      {/* Org switcher */}
      {orgs.length > 0 && (
        <div className="px-3 py-3 border-b border-[var(--border-color)]">
          <label
            htmlFor="workspace-switcher"
            className="mb-2 block px-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
          >
            Workspace
          </label>
          <div className="relative">
            <select
              id="workspace-switcher"
              value={activeOrgId ?? ""}
              onChange={(e) => handleOrgSwitch(e.target.value)}
              disabled={switchingOrg}
              className="ui-select w-full appearance-none cursor-pointer py-1.5 pl-2.5 pr-7 text-[12px] font-medium disabled:cursor-wait"
              aria-label="Switch workspace"
            >
              {orgs.map((m) => (
                <option key={m.orgId} value={m.orgId}>{m.org.name}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {switchingOrg && (
            <p className="mt-2 px-0.5 text-[11px] text-dim">Switching workspace…</p>
          )}
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <NavLink href="/dashboard" label="Notes"       icon={<IconNotes />}  active={isActive("/dashboard")} />
        <NavLink href="/invites"   label="Invites"     icon={<IconMail />}   active={isActive("/invites")} badge={pendingInvites || undefined} />
        <NavLink href="/orgs"      label="Org Settings" icon={<IconOrg />}   active={isActive("/orgs")} />
        {isAdmin && (
          <NavLink href="/audit" label="Audit Log" icon={<IconAudit />} active={isActive("/audit")} />
        )}

        {hasOrg && (
          <div className="pt-3 px-0.5">
            <Link
              href="/notes/new"
              className="ui-btn-primary flex w-full items-center justify-center gap-1.5 py-2 text-[12px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Note
            </Link>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-[var(--border-color)] px-3 py-3 space-y-1.5">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="w-7 h-7 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-[11px] font-bold shrink-0 border border-[var(--accent-soft)]">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-ink truncate leading-tight">{userName}</p>
            {userEmail && userName !== userEmail && (
              <p className="text-[11px] text-muted truncate leading-tight">{userEmail}</p>
            )}
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={() => signOut({ redirectUrl: "/login" })}
          className="w-full flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[12px] text-dim transition-colors hover:bg-[var(--red-soft)] hover:text-bad"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col bg-rail border-r border-[var(--border-color)]">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-[220px] bg-rail border-r border-[var(--border-color)] flex flex-col">
            {sidebarContent}
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-rail border-b border-[var(--border-color)]">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-[6px] hover:bg-subtle text-dim">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="font-display font-semibold text-[14px] text-ink">TeamNotes</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
