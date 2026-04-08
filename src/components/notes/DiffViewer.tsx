"use client";

export function DiffViewer({ diff }: { diff: string }) {
  const lines = diff.split("\n");

  return (
    <div className="max-h-96 overflow-auto rounded-card border border-[var(--border-color)] bg-[#16130f] font-mono text-xs shadow-card">
      {lines.map((line, i) => {
        let className = "block whitespace-pre px-4 py-0.5 text-[#d7d1c3]";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          className = "block whitespace-pre bg-[rgba(39,122,74,0.18)] px-4 py-0.5 text-[#9fd4b3]";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          className = "block whitespace-pre bg-[rgba(187,46,32,0.18)] px-4 py-0.5 text-[#f0a59b]";
        } else if (line.startsWith("@@")) {
          className = "block whitespace-pre bg-[rgba(11,114,133,0.22)] px-4 py-0.5 text-[#8ad7e5]";
        } else if (line.startsWith("+++") || line.startsWith("---")) {
          className = "block whitespace-pre px-4 py-0.5 text-[#9a9180]";
        }
        return (
          <span key={i} className={className}>
            {line || " "}
          </span>
        );
      })}
    </div>
  );
}
