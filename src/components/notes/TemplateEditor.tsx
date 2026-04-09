"use client";
import { getActionError } from "@/lib/action-error";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTemplate, updateTemplate } from "@/actions/templates";

type TemplateEditorProps =
  | { mode: "create" }
  | { mode: "edit"; template: { id: string; title: string; content: string } };

export function TemplateEditor(props: TemplateEditorProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [title, setTitle] = useState(isEdit ? props.template.title : "");
  const [content, setContent] = useState(isEdit ? props.template.content : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await updateTemplate(props.template.id, { title: title.trim(), content });
      } else {
        await createTemplate({ title: title.trim(), content });
      }
      router.push("/templates");
      router.refresh();
    } catch (err) {
      setError(getActionError(err, "Save failed"));
      setSaving(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-5 p-3 bg-bad-soft border border-[var(--red-soft)] text-bad rounded-card text-[13px] flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1.5 uppercase tracking-widest">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (error) setError(""); }}
            required
            autoFocus
            maxLength={500}
            className="w-full bg-surface border border-[var(--border-color)] rounded-card px-4 py-2.5 text-[14px] text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
            placeholder="Template title (e.g. Meeting Notes, Bug Report)"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1.5 uppercase tracking-widest">Default Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="w-full bg-surface border border-[var(--border-color)] rounded-card px-4 py-3 text-[14px] text-ink placeholder-muted font-mono leading-[1.7] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors resize-y"
            placeholder="Optional default content for notes created from this template…"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-[var(--accent)] text-white px-5 py-2.5 rounded-card text-[13px] font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create template"}
          </button>
          <Link
            href="/templates"
            className="px-5 py-2.5 border border-[var(--border-color)] text-dim text-[13px] font-medium rounded-card hover:bg-subtle transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
