"use client";

import { SignIn } from "@clerk/nextjs";
import { useTheme } from "@/providers/ThemeProvider";

export default function LoginForm() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <SignIn
      fallbackRedirectUrl="/dashboard"
      appearance={{
        variables: {
          colorPrimary: isDark ? "#2BB5CC" : "#0B7285",
          colorBackground: isDark ? "#1A1814" : "#FFFFFF",
          colorText: isDark ? "#EBE5D6" : "#1A1712",
          colorTextSecondary: isDark ? "#9A9180" : "#706A5C",
          colorInputBackground: isDark ? "#0D0C0A" : "#F6F3EC",
          colorInputText: isDark ? "#EBE5D6" : "#1A1712",
          colorNeutral: isDark ? "#9A9180" : "#706A5C",
          borderRadius: "10px",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        },
      }}
    />
  );
}
