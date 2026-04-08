"use client";
import { useClerk } from "@clerk/nextjs";

export function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <button
      onClick={() => signOut({ redirectUrl: "/login" })}
      className="rounded-[6px] px-2 py-1 text-sm text-dim transition-colors hover:bg-subtle hover:text-ink"
    >
      Sign out
    </button>
  );
}
