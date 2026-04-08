"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const THEME_SWITCH_FLAG = "themeSwitching";
const THEME_SWITCH_DURATION_MS = 420;
const listeners = new Set<() => void>();

let currentTheme: Theme = "light";
let initialized = false;
let themeSwitchTimeout: number | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function applyTheme(theme: Theme, persist = true) {
  currentTheme = theme;

  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
  }

  if (persist && typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }

  notify();
}

function setThemeSwitching(active: boolean) {
  if (typeof document === "undefined") return;

  if (active) {
    document.documentElement.dataset[THEME_SWITCH_FLAG] = "true";
    return;
  }

  delete document.documentElement.dataset[THEME_SWITCH_FLAG];
}

function startThemeTransition() {
  if (typeof window === "undefined") return;

  setThemeSwitching(true);

  if (themeSwitchTimeout) {
    window.clearTimeout(themeSwitchTimeout);
  }

  themeSwitchTimeout = window.setTimeout(() => {
    setThemeSwitching(false);
    themeSwitchTimeout = null;
  }, THEME_SWITCH_DURATION_MS);
}

function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function initThemeStore() {
  if (initialized || typeof document === "undefined") return;
  initialized = true;

  const domTheme = document.documentElement.classList.contains("dark") ? "dark" : null;
  const initial = domTheme ?? resolveInitialTheme();
  applyTheme(initial, false);
}

export function setTheme(theme: Theme) {
  startThemeTransition();
  applyTheme(theme, true);
}

export function toggleTheme() {
  startThemeTransition();
  applyTheme(currentTheme === "dark" ? "light" : "dark", true);
}

export function getThemeSnapshot() {
  return currentTheme;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemeStore() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "light");
  return {
    theme,
    toggle: toggleTheme,
    setTheme,
  };
}
