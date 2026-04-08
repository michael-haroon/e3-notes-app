"use client";

import { SignUp } from "@clerk/nextjs";
import { useTheme } from "@/providers/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RegisterForm() {
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
          routing="path"
          path="/register"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary:           theme === "dark" ? "#2BB5CC" : "#0B7285",
              colorBackground:        theme === "dark" ? "#1C1916" : "#FFFFFF",
              colorText:              theme === "dark" ? "#EBE5D6" : "#18160F",
              colorTextSecondary:     theme === "dark" ? "#A09888" : "#4A4440",
              colorInputBackground:   theme === "dark" ? "#111009" : "#F7F5F0",
              colorInputText:         theme === "dark" ? "#EBE5D6" : "#18160F",
              colorNeutral:           theme === "dark" ? "#EBE5D6" : "#18160F",
              colorTextOnPrimaryBackground: "#FFFFFF",
              borderRadius: "10px",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: "14px",
            },
            elements: {
              card:                  { backgroundColor: theme === "dark" ? "#1C1916" : "#FFFFFF", boxShadow: "var(--shadow-float)" },
              headerTitle:           { color: theme === "dark" ? "#EBE5D6" : "#18160F", fontFamily: "var(--font-lora), Georgia, serif" },
              headerSubtitle:        { color: theme === "dark" ? "#A09888" : "#4A4440" },
              formFieldLabel:        { color: theme === "dark" ? "#A09888" : "#4A4440" },
              formFieldInput:        { color: theme === "dark" ? "#EBE5D6" : "#18160F", backgroundColor: theme === "dark" ? "#111009" : "#F7F5F0", borderColor: theme === "dark" ? "rgba(235,229,214,0.12)" : "rgba(24,22,15,0.14)" },
              formButtonPrimary:     { backgroundColor: theme === "dark" ? "#2BB5CC" : "#0B7285", color: "#fff" },
              footerActionText:      { color: theme === "dark" ? "#A09888" : "#4A4440" },
              footerActionLink:      { color: theme === "dark" ? "#2BB5CC" : "#0B7285" },
              dividerText:           { color: theme === "dark" ? "#A09888" : "#4A4440" },
              dividerLine:           { backgroundColor: theme === "dark" ? "rgba(235,229,214,0.12)" : "rgba(24,22,15,0.14)" },
              socialButtonsBlockButton:     { borderColor: theme === "dark" ? "rgba(235,229,214,0.12)" : "rgba(24,22,15,0.14)", color: theme === "dark" ? "#EBE5D6" : "#18160F" },
              socialButtonsBlockButtonText: { color: theme === "dark" ? "#EBE5D6" : "#18160F" },
            },
          }}
        />
      </div>
    </div>
  );
}
