"use client";

import { useEffect } from "react";
import { initThemeStore, useThemeStore } from "@/lib/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initThemeStore();
  }, []);

  return <>{children}</>;
}

export const useTheme = useThemeStore;
