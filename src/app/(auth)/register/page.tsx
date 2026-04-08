"use client";

import { SignUp } from "@clerk/nextjs";
import { useTheme } from "@/providers/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RegisterPage() {
  const { theme } = useTheme();

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
        <SignUp
          fallbackRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: theme === "dark" ? "#2BB5CC" : "#0B7285",
              colorBackground: theme === "dark" ? "#1A1814" : "#FFFFFF",
              colorText: theme === "dark" ? "#EBE5D6" : "#1A1712",
              colorTextSecondary: theme === "dark" ? "#9A9180" : "#706A5C",
              colorInputBackground: theme === "dark" ? "#0D0C0A" : "#F6F3EC",
              colorInputText: theme === "dark" ? "#EBE5D6" : "#1A1712",
              colorNeutral: theme === "dark" ? "#9A9180" : "#706A5C",
              borderRadius: "10px",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            },
          }}
        />
      </div>
    </div>
  );
}
