"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Eraser,
  FileDown,
  Highlighter,
  Lock,
  PenLine,
  ScanText,
  Type,
  Wallet,
} from "lucide-react";
import PdfUploader from "@/components/upload/PdfUploader";
import PdfEditor from "@/components/editor/PdfEditor";
import SiteHeader from "@/components/ui/SiteHeader";

const features = [
  {
    Icon: Eraser,
    title: "Edit scanned text",
    text: "Click detected text and replace it.",
  },
  {
    Icon: ScanText,
    title: "OCR powered",
    text: "Text detection runs in your browser.",
  },
  {
    Icon: Type,
    title: "Add text",
    text: "Place new text anywhere on the page.",
  },
  {
    Icon: PenLine,
    title: "Draw & sign",
    text: "Sign with a mouse or your finger.",
  },
  {
    Icon: Highlighter,
    title: "Highlight",
    text: "Mark the parts that matter.",
  },
  {
    Icon: FileDown,
    title: "Export PDF",
    text: "Download the edited document.",
  },
  {
    Icon: Lock,
    title: "Private & local",
    text: "Your file never leaves your device.",
  },
  {
    Icon: Wallet,
    title: "No credits",
    text: "Free, with no account or limits.",
  },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  if (file) return <PdfEditor file={file} onClose={() => setFile(null)} />;

  return (
    <>
      <SiteHeader />
      <main className="relative overflow-hidden">
        {/* soft background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-blue-50 via-violet-50/60 to-transparent"
        />
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -right-24 top-40 -z-10 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl"
          style={{ animationDelay: "3s" }}
        />

        <section className="mx-auto max-w-3xl px-6 pb-14 pt-20 text-center">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-sm text-blue-700">
            <Lock size={14} aria-hidden /> Your documents stay on your device
          </p>
          <h1
            className="animate-fade-up mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Edit Scanned PDFs —{" "}
            <span className="text-gradient">Completely Free</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-xl text-lg text-slate-600"
            style={{ animationDelay: "160ms" }}
          >
            Edit scanned documents directly in your browser. No login, no
            uploads, no credits. Your files stay on your device.
          </p>
          <div
            className="animate-fade-up mt-10 rounded-2xl bg-white/70 p-2 shadow-xl shadow-blue-900/5 ring-1 ring-slate-200 backdrop-blur"
            style={{ animationDelay: "240ms" }}
          >
            <PdfUploader onFile={setFile} />
          </div>
          <p
            className="animate-fade-up mt-6 text-sm"
            style={{ animationDelay: "320ms" }}
          >
            <Link
              href="/tools"
              className="group inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-800"
            >
              Browse all PDF tools
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-10">
          <h2 className="text-center text-2xl font-semibold text-slate-900">
            Features
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ Icon, title, text }) => (
              <li
                key={title}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white transition-transform duration-200 group-hover:scale-110">
                  <Icon size={20} aria-hidden />
                </span>
                <h3 className="mt-4 font-medium text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24 pt-10 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">
            Your documents stay private
          </h2>
          <p className="mt-3 text-slate-600">
            ScanEdit processes your documents directly in your browser. Your PDF
            is never uploaded to our servers.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Note: on first OCR run the browser downloads the OCR engine and
            English language data. Only those public files are fetched; your
            document is not sent anywhere.
          </p>
        </section>
      </main>
    </>
  );
}
