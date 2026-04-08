import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas:  "var(--bg)",
        surface: "var(--bg-surface)",
        subtle:  "var(--bg-subtle)",
        rail:    "var(--bg-sidebar)",
        ink:     "var(--text-1)",
        dim:     "var(--text-2)",
        muted:   "var(--text-3)",
        flame: {
          DEFAULT: "var(--accent)",
          hover:   "var(--accent-hover)",
          soft:    "var(--accent-soft)",
        },
        ok:      "var(--green)",
        "ok-soft":  "var(--green-soft)",
        bad:     "var(--red)",
        "bad-soft": "var(--red-soft)",
        warn:    "var(--amber)",
        "warn-soft": "var(--amber-soft)",
      },
      fontFamily: {
        display: ["var(--font-lora)", "Georgia", "serif"],
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        card:  "var(--shadow-sm)",
        float: "var(--shadow-md)",
      },
      borderRadius: {
        card: "var(--radius)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
