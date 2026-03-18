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

function fileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gzip")) return "🗜️";
  return "📄";
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
      const url = `/api/files?noteId=${encodeURIComponent(noteId)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      // Silently fail on list error
    }
  }, [noteId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function uploadFile(file: File) {
    clearMessages();

    if (file.size > MAX_FILE_SIZE) {
      setError(`"${file.name}" is too large. Maximum file size is 50MB.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (noteId) formData.append("noteId", noteId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }

      setSuccess(`"${data.file.filename}" uploaded successfully.`);
      if (onUpload) onUpload(data.file);
      await fetchFiles();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
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
        setError(data.error ?? "Delete failed");
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSuccess(`"${filename}" deleted.`);
    } catch {
      setError("Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-3">Attachments</h3>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
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
        <label
          htmlFor="file-upload-input"
          className="cursor-pointer text-sm text-gray-600"
        >
          {uploading ? (
            <span className="text-blue-600">Uploading...</span>
          ) : (
            <>
              <span className="font-medium text-blue-600 hover:underline">
                Click to upload
              </span>{" "}
              or drag and drop a file here
              <p className="text-xs text-gray-400 mt-1">Max 50MB</p>
            </>
          )}
        </label>
      </div>

      {/* Status messages */}
      {error && (
        <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {success}
        </p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file) => {
            const isImage = file.mimeType.startsWith("image/");
            const icon = fileTypeIcon(file.mimeType);
            const isDeleting = deletingId === file.id;

            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg text-sm"
              >
                {/* Thumbnail or icon */}
                {isImage ? (
                  <img
                    src={file.url}
                    alt={file.filename}
                    className="w-10 h-10 object-cover rounded border shrink-0"
                  />
                ) : (
                  <span className="text-xl shrink-0">{icon}</span>
                )}

                {/* File name link */}
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-gray-800 hover:underline truncate"
                >
                  {file.filename}
                </a>

                {/* File size */}
                <span className="text-gray-400 shrink-0">
                  {(file.size / 1024).toFixed(1)} KB
                </span>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(file.id, file.filename)}
                  disabled={isDeleting}
                  className="shrink-0 px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                >
                  {isDeleting ? "..." : "Delete"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
