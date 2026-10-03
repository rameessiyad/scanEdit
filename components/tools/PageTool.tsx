"use client";
import { useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Download, Loader2, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import PdfUploader from "@/components/upload/PdfUploader";
import PdfThumbnail from "@/components/pdf/PdfThumbnail";
import { describeError, loadPdf } from "@/lib/pdf/pdfRenderer";
import { buildPdf, parseRanges, type PageRef } from "@/lib/pdf/pdfTools";
import type { PageToolSlug } from "@/lib/tools";

const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40";
const primary =
  "inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40";

const CFG: Record<
  PageToolSlug,
  {
    title: string;
    hint: string;
    multi?: boolean;
    drag?: boolean;
    rot?: boolean;
    del?: boolean;
    sel?: boolean;
    out: string;
    action: string;
  }
> = {
  merge: {
    title: "Merge PDF",
    hint: "Add PDFs, drag pages to reorder, then merge.",
    multi: true,
    drag: true,
    rot: true,
    del: true,
    out: "merged.pdf",
    action: "Merge PDFs",
  },
  split: {
    title: "Split PDF",
    hint: "Split every page, the pages you select, or page ranges.",
    sel: true,
    out: "split.pdf",
    action: "Split PDF",
  },
  extract: {
    title: "Extract Pages",
    hint: "Click pages to select them, then extract.",
    sel: true,
    out: "extracted-pages.pdf",
    action: "Extract Pages",
  },
  delete: {
    title: "Delete Pages",
    hint: "Click pages to select them, remove them, then download.",
    del: true,
    sel: true,
    out: "edited.pdf",
    action: "Download PDF",
  },
  reorder: {
    title: "Reorder Pages",
    hint: "Drag pages to reorder. Rotate or delete as needed.",
    drag: true,
    rot: true,
    del: true,
    out: "organized.pdf",
    action: "Download PDF",
  },
  rotate: {
    title: "Rotate PDF",
    hint: "Select pages to rotate, or rotate all.",
    rot: true,
    sel: true,
    out: "rotated.pdf",
    action: "Download PDF",
  },
};

interface Src {
  name: string;
  bytes: Uint8Array;
  doc: PDFDocumentProxy;
}
const uid = () => Math.random().toString(36).slice(2, 10);

export default function PageTool({ tool }: { tool: PageToolSlug }) {
  const c = CFG[tool];
  const srcs = useRef<Src[]>([]);
  const dragId = useRef<string | null>(null);
  const [pages, setPages] = useState<PageRef[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<{ name: string; url: string }[]>([]);
  const [mode, setMode] = useState<"each" | "selected" | "ranges">("each");
  const [ranges, setRanges] = useState("");

  const addFiles = async (files: File[]) => {
    setErr(null);
    setBusy("Loading PDF...");
    setResults([]);
    try {
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const doc = await loadPdf(bytes);
        const src = srcs.current.length;
        srcs.current.push({ name: f.name, bytes, doc });
        setPages((ps) => [
          ...ps,
          ...Array.from({ length: doc.numPages }, (_, index) => ({
            id: uid(),
            src,
            index,
            rot: 0,
          })),
        ]);
      }
    } catch (e) {
      setErr(describeError(e));
    }
    setBusy(null);
  };

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const rotate = (deg: number, all = false) =>
    setPages((ps) =>
      ps.map((p) =>
        all || sel.has(p.id) ? { ...p, rot: (p.rot + deg + 360) % 360 } : p,
      ),
    );
  const removeIds = (ids: Set<string>) => {
    setPages((ps) => ps.filter((p) => !ids.has(p.id)));
    setSel(new Set());
    setResults([]);
  };
  const removeSelected = () => {
    if (
      sel.size &&
      confirm(
        `Remove ${sel.size} page(s)? You can still start over by re-uploading.`,
      )
    )
      removeIds(sel);
  };
  const drop = (target: string) => {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === target) return;
    setPages((ps) => {
      const moving = ps.find((p) => p.id === from)!;
      const rest = ps.filter((p) => p.id !== from);
      rest.splice(
        rest.findIndex((p) => p.id === target),
        0,
        moving,
      );
      return rest;
    });
  };

  const run = async () => {
    setErr(null);
    setResults([]);
    try {
      const chosen = pages.filter((p) => sel.has(p.id));
      let jobs: { name: string; pages: PageRef[] }[];
      if (tool === "extract") {
        if (!chosen.length) throw new Error("Select at least one page.");
        jobs = [{ name: c.out, pages: chosen }];
      } else if (tool === "split") {
        if (mode === "each")
          jobs = pages.map((p, i) => ({
            name: `page-${i + 1}.pdf`,
            pages: [p],
          }));
        else if (mode === "selected") {
          if (!chosen.length) throw new Error("Select at least one page.");
          jobs = [{ name: "selected-pages.pdf", pages: chosen }];
        } else
          jobs = parseRanges(ranges, pages.length).map((g, i) => ({
            name: `split-${i + 1}.pdf`,
            pages: g.map((k) => pages[k]),
          }));
      } else jobs = [{ name: c.out, pages }];
      if (jobs.some((j) => !j.pages.length))
        throw new Error("There are no pages to export.");
      const out: { name: string; url: string }[] = [];
      for (let i = 0; i < jobs.length; i++) {
        setBusy(`Preparing your PDF... (${i + 1}/${jobs.length})`);
        const bytes = await buildPdf(
          srcs.current.map((s) => s.bytes),
          jobs[i].pages,
        );
        out.push({
          name: jobs[i].name,
          url: URL.createObjectURL(
            new Blob([bytes as BlobPart], { type: "application/pdf" }),
          ),
        });
      }
      setResults(out);
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "This PDF could not be processed in your browser. Try a smaller document.",
      );
    }
    setBusy(null);
  };

  const reset = () => {
    srcs.current = [];
    setPages([]);
    setSel(new Set());
    setResults([]);
    setErr(null);
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold">{c.title}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {c.hint} Your documents stay on your device.
      </p>

      {(!pages.length || c.multi) && (
        <div className="mt-6">
          <PdfUploader multiple={c.multi} onFiles={addFiles} />
        </div>
      )}
      {busy && (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm">
          <Loader2 size={16} className="animate-spin" />
          {busy}
        </p>
      )}
      {err && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {err}
        </p>
      )}

      {pages.length > 0 && (
        <>
          <div className="sticky top-0 z-10 mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/95 py-2">
            <span className="mr-2 text-sm text-slate-600">
              {pages.length} pages{c.sel ? ` • ${sel.size} selected` : ""}
            </span>
            {c.sel && (
              <button
                className={btn}
                onClick={() => setSel(new Set(pages.map((p) => p.id)))}
              >
                Select all
              </button>
            )}
            {c.sel && (
              <button
                className={btn}
                onClick={() => setSel(new Set())}
                disabled={!sel.size}
              >
                Clear
              </button>
            )}
            {tool === "rotate" && (
              <>
                <button
                  className={btn}
                  onClick={() => rotate(-90)}
                  disabled={!sel.size}
                >
                  <RotateCcw size={14} />
                  90° left
                </button>
                <button
                  className={btn}
                  onClick={() => rotate(90)}
                  disabled={!sel.size}
                >
                  <RotateCw size={14} />
                  90° right
                </button>
                <button
                  className={btn}
                  onClick={() => rotate(180)}
                  disabled={!sel.size}
                >
                  180°
                </button>
                <button className={btn} onClick={() => rotate(90, true)}>
                  Rotate all
                </button>
              </>
            )}
            {tool === "delete" && (
              <button
                className={btn}
                onClick={removeSelected}
                disabled={!sel.size}
              >
                <Trash2 size={14} />
                Delete selected
              </button>
            )}
            {tool === "split" && (
              <>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  aria-label="Split mode"
                >
                  <option value="each">Every page separately</option>
                  <option value="selected">Selected pages</option>
                  <option value="ranges">Page ranges</option>
                </select>
                {mode === "ranges" && (
                  <input
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                    placeholder="1-3, 5, 7-10"
                    aria-label="Page ranges"
                    className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                )}
              </>
            )}
            <button
              className="ml-auto text-sm text-slate-500 underline"
              onClick={reset}
            >
              Start over
            </button>
            <button className={primary} onClick={run} disabled={!!busy}>
              {c.action}
            </button>
          </div>

          {results.length > 0 && (
            <div
              className="mt-4 rounded-md border border-green-200 bg-green-50 p-4"
              role="status"
            >
              <p className="font-medium">
                Your PDF{results.length > 1 ? "s are" : " is"} ready.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {results.map((r) => (
                  <li key={r.name}>
                    <a href={r.url} download={r.name} className={primary}>
                      <Download size={14} />
                      {r.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {pages.map((p, n) => (
              <li
                key={p.id}
                draggable={c.drag}
                onDragStart={() => (dragId.current = p.id)}
                onDragOver={(e) => c.drag && e.preventDefault()}
                onDrop={() => drop(p.id)}
                onClick={() => c.sel && toggle(p.id)}
                className={`group relative rounded-lg border bg-slate-100 p-2 ${sel.has(p.id) ? "border-blue-600 ring-2 ring-blue-600" : "border-slate-200"} ${c.drag ? "cursor-grab" : c.sel ? "cursor-pointer" : ""}`}
              >
                <PdfThumbnail
                  doc={srcs.current[p.src].doc}
                  index={p.index}
                  rot={p.rot}
                />
                <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                  <span className="truncate">
                    {n + 1}
                    {c.multi ? ` • ${srcs.current[p.src].name}` : ""}
                  </span>
                  <span className="flex gap-1">
                    {c.rot && (
                      <button
                        aria-label={`Rotate page ${n + 1}`}
                        className="rounded p-1 hover:bg-slate-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPages((ps) =>
                            ps.map((q) =>
                              q.id === p.id
                                ? { ...q, rot: (q.rot + 90) % 360 }
                                : q,
                            ),
                          );
                        }}
                      >
                        <RotateCw size={14} />
                      </button>
                    )}
                    {c.del && tool !== "delete" && (
                      <button
                        aria-label={`Delete page ${n + 1}`}
                        className="rounded p-1 hover:bg-slate-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeIds(new Set([p.id]));
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
