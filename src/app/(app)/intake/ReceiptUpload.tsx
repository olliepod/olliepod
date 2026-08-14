"use client";

import { useState } from "react";
import { uploadReceiptFile } from "@/lib/uploadClient";

type UploadedFile = { key: string; name: string };

export default function ReceiptUpload({
  label,
  onChange,
}: {
  label: string;
  onChange: (keys: string[]) => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: UploadedFile[] = [];
      for (const file of Array.from(fileList)) {
        const key = await uploadReceiptFile(file);
        uploaded.push({ key, name: file.name });
      }
      const next = [...files, ...uploaded];
      setFiles(next);
      onChange(next.map((f) => f.key));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function removeFile(key: string) {
    const next = files.filter((f) => f.key !== key);
    setFiles(next);
    onChange(next.map((f) => f.key));
  }

  return (
    <div className="flex flex-col gap-1 text-xs text-neutral-600">
      <span>{label}</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        disabled={uploading}
        className="text-xs"
      />
      {uploading && <span className="text-neutral-500">Uploading…</span>}
      {error && <span className="text-red-600">{error}</span>}
      {files.length > 0 && (
        <ul className="flex flex-col gap-0.5 mt-1">
          {files.map((f) => (
            <li key={f.key} className="flex items-center gap-2 text-neutral-700">
              {f.name}
              <button type="button" onClick={() => removeFile(f.key)} className="text-red-600 hover:underline">
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
