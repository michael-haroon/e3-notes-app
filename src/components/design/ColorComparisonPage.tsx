import Link from "next/link";
import type { CSSProperties } from "react";

type Palette = {
  name: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentSoftHover: string;
  note: string;
};

const palettes: Palette[] = [
  {
    name: "Current Teal",
    accent: "#0B7285",
    accentHover: "#095F70",
    accentSoft: "rgba(11, 114, 133, 0.09)",
    accentSoftHover: "rgba(11, 114, 133, 0.16)",
    note: "Closest to the current token set. Keeps the calm teal-blue identity.",
  },
  {
    name: "Deeper Ink Blue",
    accent: "#165D86",
    accentHover: "#124B6B",
    accentSoft: "rgba(22, 93, 134, 0.10)",
    accentSoftHover: "rgba(22, 93, 134, 0.18)",
    note: "Feels a bit more editorial and less playful while staying familiar.",
  },
  {
    name: "Slate Teal",
    accent: "#2A6F77",
    accentHover: "#225C63",
    accentSoft: "rgba(42, 111, 119, 0.10)",
    accentSoftHover: "rgba(42, 111, 119, 0.18)",
    note: "More muted and understated. Good if you want the accent to recede slightly.",
  },
  {
    name: "Brighter Cyan",
    accent: "#0F8AA1",
    accentHover: "#0C7488",
    accentSoft: "rgba(15, 138, 161, 0.10)",
    accentSoftHover: "rgba(15, 138, 161, 0.18)",
    note: "More energetic and modern, but also more noticeable across the app.",
  },
];

function ExampleCard({ palette }: { palette: Palette }) {
  return (
    <section
      className="rounded-card border border-[var(--border-color)] bg-surface p-5 shadow-card"
      style={
        {
          "--accent": palette.accent,
          "--accent-hover": palette.accentHover,
          "--accent-soft": palette.accentSoft,
          "--accent-soft-hover": palette.accentSoftHover,
        } as CSSProperties
      }
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">{palette.name}</h2>
          <p className="mt-1 text-sm text-dim">{palette.note}</p>
        </div>
        <div className="rounded-full border border-[var(--border-color)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
          Accent preview
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-card border border-[var(--border-color)]" style={{ backgroundColor: palette.accent }} />
        <div className="h-10 w-10 rounded-card border border-[var(--border-color)]" style={{ backgroundColor: palette.accentHover }} />
        <div className="h-10 w-10 rounded-card border border-[var(--border-color)]" style={{ backgroundColor: palette.accentSoft }} />
        <div className="text-xs text-dim">
          <p>{palette.accent}</p>
          <p>{palette.accentHover}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-card border border-[var(--border-color)] bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Buttons</p>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-card bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]">
              Primary Action
            </button>
            <button className="rounded-card border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-subtle hover:text-ink">
              Secondary
            </button>
            <button className="rounded-card border border-[var(--red-soft)] bg-bad-soft px-4 py-2 text-sm font-medium text-bad">
              Danger
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-card border border-[var(--border-color)] bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Tags And Status</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">Org</span>
            <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-dim">Private</span>
            <span className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-medium text-ok">Shared</span>
            <span className="rounded-full border border-[var(--border-color)] bg-surface px-2.5 py-1 text-xs font-medium text-dim">#product</span>
          </div>
        </div>

        <div className="space-y-3 rounded-card border border-[var(--border-color)] bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Inputs</p>
          <div className="space-y-2">
            <input
              readOnly
              value="Search notes"
              className="w-full rounded-card border border-[var(--border-color)] bg-surface px-3 py-2.5 text-sm text-ink outline-none ring-2 ring-[var(--accent-soft)]"
            />
            <select
              defaultValue="alpha"
              className="w-full rounded-card border border-[var(--border-color)] bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="alpha">Acme Product</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 rounded-card border border-[var(--border-color)] bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Nav State</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 rounded-[8px] bg-[var(--accent-soft)] px-3 py-2 text-sm font-medium text-[var(--accent)]">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              Active Navigation Item
            </div>
            <div className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm font-medium text-dim">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-muted" />
              Inactive Navigation Item
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LegacyComparison() {
  return (
    <section className="rounded-card border border-[var(--border-color)] bg-surface p-5 shadow-card">
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold text-ink">Current Inconsistent States</h2>
        <p className="mt-1 text-sm text-dim">
          This mirrors the kind of drift in the app today: tokenized teal in some places, raw Tailwind blue and gray in others.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-card border border-[var(--border-color)] bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Tokenized</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">Org</span>
            <button className="rounded-card bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">Primary</button>
          </div>
        </div>

        <div className="space-y-3 rounded-card border border-[var(--border-color)] bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Raw Tailwind</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">Org</span>
            <button className="rounded-card bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Primary</button>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">Private</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ColorComparisonPage({ backHref = "/", backLabel = "Back" }: { backHref?: string; backLabel?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">UI Accent Study</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">Color Comparison</h1>
          <p className="mt-2 max-w-2xl text-sm text-dim">
            A side-by-side preview of the current accent direction and a few nearby options, using the same UI states that currently feel inconsistent.
          </p>
        </div>
        <Link href={backHref} className="text-sm font-medium text-[var(--accent)] hover:underline">
          {backLabel}
        </Link>
      </div>

      <div className="space-y-6">
        <LegacyComparison />
        {palettes.map((palette) => (
          <ExampleCard key={palette.name} palette={palette} />
        ))}
      </div>
    </div>
  );
}
