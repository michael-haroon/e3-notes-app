"use client";
import { getActionError } from "@/lib/action-error";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteTemplate } from "@/actions/templates";

type Template = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
};

export function TemplatesList({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(templateId: string, title: string) {
    if (!confirm(`Delete template "${title}"? This cannot be undone.`)) return;
    setDeletingId(templateId);
    try {
      await deleteTemplate(templateId);
      router.refresh();
    } catch (err) {
      alert(getActionError(err, "Failed to delete template"));
    } finally {
      setDeletingId(null);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="ui-card flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-subtle flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="font-display text-base font-medium text-ink mb-1">No templates yet</p>
        <p className="text-sm text-dim mb-5">Create a template to reuse note structures across your team.</p>
        <Link href="/templates/new" className="flex items-center gap-1.5 bg-[var(--accent)] text-white px-4 py-2 rounded-card text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Template
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map((template) => {
        const dateLabel = new Date(template.createdAt).toLocaleDateString(undefined, {
          month: "short", day: "numeric", year: "numeric",
        });
        return (
          <div
            key={template.id}
            className="bg-surface border border-[var(--border-color)] rounded-card px-5 py-4 flex items-start gap-4 hover:shadow-card hover:border-[var(--border-strong)] transition-all"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink text-[14px] truncate mb-0.5">{template.title}</p>
              {template.content && (
                <p className="text-[13px] text-dim line-clamp-2 leading-relaxed font-mono">
                  {template.content}
                </p>
              )}
              <p className="text-[11px] text-muted mt-1.5">Created {dateLabel}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/notes/new?templateId=${template.id}`}
                className="ui-btn-secondary px-3 py-1.5 text-[12px]"
              >
                Use
              </Link>
              <Link
                href={`/templates/${template.id}/edit`}
                className="ui-btn-secondary px-3 py-1.5 text-[12px]"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(template.id, template.title)}
                disabled={deletingId === template.id}
                className="ui-btn-danger px-3 py-1.5 text-[12px] disabled:opacity-50"
              >
                {deletingId === template.id ? "…" : "Delete"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
