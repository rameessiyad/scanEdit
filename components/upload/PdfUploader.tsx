"use client";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";

interface Props {
  onFile?: (f: File) => void;
  onFiles?: (f: File[]) => void;
  multiple?: boolean;
}

export default function PdfUploader({ onFile, onFiles, multiple }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list?: FileList | null) => {
    const files = Array.from(list ?? []).filter(
      (f) =>
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (!files.length) return alert("Please choose a .pdf file.");
    if (onFiles) onFiles(multiple ? files : files.slice(0, 1));
    else onFile?.(files[0]);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={`rounded-lg border-2 border-dashed p-10 text-center ${over ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white"}`}
    >
      <input
        ref={input}
        type="file"
        accept=".pdf,application/pdf"
        multiple={multiple}
        className="sr-only"
        aria-label="Choose a PDF"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => input.current?.click()}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
      >
        <Upload size={18} aria-hidden />{" "}
        {multiple ? "Upload PDFs" : "Upload PDF"}
      </button>
      <p className="mt-3 text-sm text-slate-500">
        or drag and drop {multiple ? "PDFs" : "a PDF"} here
      </p>
      <p className="mt-4 text-sm text-slate-600">
        🔒 100% client-side • No account required • Free forever
      </p>
    </div>
  );
}
