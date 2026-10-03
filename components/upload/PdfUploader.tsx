"use client";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";

export default function PdfUploader({ onFile }: { onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (f?: File) => {
    if (
      f &&
      (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
    )
      onFile(f);
    else alert("Please choose a .pdf file.");
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
        take(e.dataTransfer.files[0]);
      }}
      className={`rounded-lg border-2 border-dashed p-10 text-center ${over ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white"}`}
    >
      <input
        ref={input}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        aria-label="Choose a PDF"
        onChange={(e) => take(e.target.files?.[0])}
      />
      <button
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
      >
        <Upload size={18} aria-hidden /> Upload PDF
      </button>
      <p className="mt-3 text-sm text-slate-500">
        or drag and drop a scanned PDF here
      </p>
      <p className="mt-4 text-sm text-slate-600">
        🔒 100% client-side • No account required • Free forever
      </p>
    </div>
  );
}
