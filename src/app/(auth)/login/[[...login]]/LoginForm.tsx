"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginForm() {
  const text = "#18160F";
  const subtext = "#4A4440";
  const bg = "#FFFFFF";
  const inputBg = "#F7F5F0";
  const border = "rgba(24,22,15,0.14)";
  const accent = "#0B7285";

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
