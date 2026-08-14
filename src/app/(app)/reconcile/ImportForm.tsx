"use client";

import { useRef, useState, useTransition } from "react";
import type { ImportState } from "./actions";

export default function ImportForm({
  label,
  action,
}: {
  label: string;
  action: (input: { csvText: string; fileName?: string }) => Promise<ImportState>;
}) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();
  const [result, setResult] = useState<ImportState>({});
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const res = await action({ csvText, fileName });
      setResult(res);
      if (res.success) {
        setCsvText("");
        setFileName(undefined);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">{label}</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="text-xs"
        />
        <textarea
          className="input font-mono text-xs h-24"
          placeholder="...or paste the CSV contents here"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
      </div>
      <div>
        <button type="submit" disabled={pending || !csvText.trim()} className="btn-primary">
          {pending ? "Importing…" : "Import"}
        </button>
      </div>
      {result.error && <p className="text-sm text-red-600">{result.error}</p>}
      {result.success && <p className="text-sm text-green-700">{result.success}</p>}
    </form>
  );
}
