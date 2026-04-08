export function splitHighlightedText(text: string, query: string): string[] {
  if (!query.trim()) return [text];

  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [text];

  const pattern = new RegExp(
    `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );

  return text.split(pattern);
}
