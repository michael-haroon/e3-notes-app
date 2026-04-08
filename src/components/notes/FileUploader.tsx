"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UploadedFile = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  noteId: string | null;
  createdAt: string;
};

type Props = {
  noteId?: string;
  onUpload?: (file: { id: string; filename: string; url: string }) => void;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return null; // shows thumbnail instead
  if (mimeType.startsWith("audio/")) {
    return (
      <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

export function FileUploader({ noteId, onUpload }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    if (!noteId) return;
    try {
      const res = await fetch(`/api/files?noteId=${encodeURIComponent(noteId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      // Silently fail on list error; files will be empty
    }
  }, [noteId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  function clearMessages() { setError(null); setSuccess(null); }

  async function uploadFile(file: File) {
    clearMessages();
    if (file.size > MAX_FILE_SIZE) {
      setError(`"${file.name}" exceeds the 50 MB limit (${formatFileSize(file.size)}).`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (noteId) formData.append("noteId", noteId);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
      setSuccess(`"${data.file.filename}" uploaded.`);
      if (onUpload) onUpload(data.file);
      await fetchFiles();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setDeletingId(fileId);
    clearMessages();
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed.");
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSuccess(`"${filename}" deleted.`);
    } catch {
      setError("Delete failed. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-surface border border-[var(--border-color)] rounded-card shadow-card">
      <div className="px-5 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
        <h3 className="font-medium text-[13px] text-ink">Attachments</h3>
        {files.length > 0 && (
          <span className="text-[11px] bg-subtle text-dim px-2 py-0.5 rounded-full">{files.length}</span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-[8px] p-5 text-center transition-colors ${
            dragging
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            id="file-upload-input"
            className="sr-only"
            onChange={handleInputChange}
            disabled={uploading}
          />
          <label htmlFor="file-upload-input" className="cursor-pointer">
            {uploading ? (
              <span className="text-[13px] text-[var(--accent)]">Uploading…</span>
            ) : (
              <>
                <svg className="w-6 h-6 text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-[13px] text-dim">
                  <span className="text-[var(--accent)] font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-[11px] text-muted mt-1">Max 50 MB</p>
              </>
            )}
          </label>
        </div>

        {/* Status messages */}
        {error && (
          <p className="text-[12px] text-bad bg-bad-soft border border-[var(--red-soft)] rounded-[6px] px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-[12px] text-ok bg-ok-soft border border-[var(--green-soft)] rounded-[6px] px-3 py-2">{success}</p>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => {
              const isImage = file.mimeType.startsWith("image/");
              return (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-subtle border border-[var(--border-color)] rounded-[7px]">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-9 h-9 object-cover rounded-[5px] border border-[var(--border-color)] shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-9 h-9 bg-surface border border-[var(--border-color)] rounded-[5px] flex items-center justify-center shrink-0">
                      <FileIcon mimeType={file.mimeType} />
                    </div>
                  )}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-[13px] text-ink hover:text-[var(--accent)] truncate transition-colors"
                  >
                    {file.filename}
                  </a>
                  <span className="text-[11px] text-muted shrink-0">{formatFileSize(file.size)}</span>
                  <button
                    onClick={() => handleDelete(file.id, file.filename)}
                    disabled={deletingId === file.id}
                    className="shrink-0 text-[11px] text-bad hover:opacity-70 px-2 py-1 rounded-[5px] hover:bg-bad-soft disabled:opacity-40 transition-colors"
                  >
                    {deletingId === file.id ? "…" : "Delete"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
