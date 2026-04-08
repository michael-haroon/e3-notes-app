"use client";

import { SignIn } from "@clerk/nextjs";
import { useTheme } from "@/providers/ThemeProvider";

export default function LoginForm() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const text    = isDark ? "#EBE5D6" : "#18160F";
  const subtext = isDark ? "#A09888" : "#4A4440";
  const bg      = isDark ? "#1C1916" : "#FFFFFF";
  const inputBg = isDark ? "#111009" : "#F7F5F0";
  const border  = isDark ? "rgba(235,229,214,0.12)" : "rgba(24,22,15,0.14)";
  const accent  = isDark ? "#2BB5CC" : "#0B7285";

  return (
    <SignIn
      routing="path"
      path="/login"
      fallbackRedirectUrl="/dashboard"
      appearance={{
        variables: {
          colorPrimary: accent,
          colorBackground: bg,
          colorText: text,
          colorTextSecondary: subtext,
          colorInputBackground: inputBg,
          colorInputText: text,
          colorNeutral: text,
          colorTextOnPrimaryBackground: "#FFFFFF",
          borderRadius: "10px",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          fontSize: "14px",
        },
        elements: {
          card:                  { backgroundColor: bg, boxShadow: "var(--shadow-float)" },
          headerTitle:           { color: text, fontFamily: "var(--font-lora), Georgia, serif" },
          headerSubtitle:        { color: subtext },
          formFieldLabel:        { color: subtext },
          formFieldInput:        { color: text, backgroundColor: inputBg, borderColor: border },
          formFieldInputShowPasswordButton: { color: subtext },
          identityPreviewText:   { color: text },
          identityPreviewEditButton: { color: accent },
          formButtonPrimary:     { backgroundColor: accent, color: "#fff" },
          footerActionText:      { color: subtext },
          footerActionLink:      { color: accent },
          dividerText:           { color: subtext },
          dividerLine:           { backgroundColor: border },
          socialButtonsBlockButton:     { borderColor: border, color: text, backgroundColor: bg },
          socialButtonsBlockButtonText: { color: text },
          alternativeMethodsBlockButton: { borderColor: border, color: text },
          otpCodeFieldInput:     { color: text, backgroundColor: inputBg, borderColor: border },
        },
      }}
    />
  );
}
