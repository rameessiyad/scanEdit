"use client";
import { useState } from "react";
import PdfUploader from "@/components/upload/PdfUploader";
import PdfEditor from "@/components/editor/PdfEditor";

const features = [
  "📝 Edit scanned text",
  "🔍 OCR powered",
  "✏️ Add text",
  "🖊️ Draw & sign",
  "🟨 Highlight",
  "📄 Export PDF",
  "🔒 Private & local",
  "💸 No credits",
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  if (file) return <PdfEditor file={file} onClose={() => setFile(null)} />;
  return (
    <main>
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Edit Scanned PDFs — Completely Free
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          Edit scanned documents directly in your browser. No login, no uploads,
          no credits. Your files stay on your device.
        </p>
        <div className="mt-10">
          <PdfUploader onFile={setFile} />
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-xl font-semibold">Features</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {features.map((f) => (
            <li
              key={f}
              className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm"
            >
              {f}
            </li>
          ))}
        </ul>
      </section>
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-6">
        <h2 className="text-xl font-semibold">Your documents stay private</h2>
        <p className="mt-2 text-slate-600">
          ScanEdit processes your documents directly in your browser. Your PDF
          is never uploaded to our servers.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Note: on first OCR run the browser downloads the OCR engine and
          English language data. Only those public files are fetched; your
          document is not sent anywhere.
        </p>
      </section>
    </main>
  );
}
