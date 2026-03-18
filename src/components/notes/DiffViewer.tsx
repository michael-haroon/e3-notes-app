"use client";

export function DiffViewer({ diff }: { diff: string }) {
  const lines = diff.split("\n");

  return (
    <div className="overflow-auto max-h-96 rounded-lg border bg-gray-900 font-mono text-xs">
      {lines.map((line, i) => {
        let className = "px-4 py-0.5 block whitespace-pre text-gray-300";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          className = "px-4 py-0.5 block whitespace-pre bg-green-950 text-green-300";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          className = "px-4 py-0.5 block whitespace-pre bg-red-950 text-red-300";
        } else if (line.startsWith("@@")) {
          className = "px-4 py-0.5 block whitespace-pre bg-blue-950 text-blue-300";
        } else if (line.startsWith("+++") || line.startsWith("---")) {
          className = "px-4 py-0.5 block whitespace-pre text-gray-400";
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
