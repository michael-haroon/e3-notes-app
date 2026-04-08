import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-[var(--accent)] rounded-[8px] flex items-center justify-center">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} className="text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </div>
          <span className="font-display font-semibold text-[17px] text-ink">TeamNotes</span>
        </div>
        <Suspense fallback={<div className="h-64 bg-surface border border-[var(--border-color)] rounded-card animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
