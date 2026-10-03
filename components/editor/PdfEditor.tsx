"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Highlighter,
  Loader2,
  MousePointer2,
  Pen,
  Redo2,
  ScanText,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Item, OcrBlock, TextItem, Tool } from "@/lib/types/editor";
import {
  describeError,
  getPageSize,
  loadPdf,
  renderPage,
} from "@/lib/pdf/pdfRenderer";
import { runOcr } from "@/lib/ocr/ocrEngine";
import { exportPdf } from "@/lib/pdf/pdfExporter";

type Live =
  | { kind: "draw"; pts: [number, number][] }
  | { kind: "hl"; x0: number; y0: number; x1: number; y1: number }
  | null;
type Hist = { past: Item[][]; items: Item[]; future: Item[][] };
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40";

function sampleBg(
  c: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const ctx = c.getContext("2d")!;
  const pts = [
    [x - 3, y - 3],
    [x + w + 3, y - 3],
    [x - 3, y + h + 3],
    [x + w + 3, y + h + 3],
  ];
  let r = 0,
    g = 0,
    b = 0;
  for (const [px, py] of pts) {
    const d = ctx.getImageData(
      Math.max(0, Math.min(c.width - 1, Math.round(px))),
      Math.max(0, Math.min(c.height - 1, Math.round(py))),
      1,
      1,
    ).data;
    r += d[0];
    g += d[1];
    b += d[2];
  }
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(v / 4)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export default function PdfEditor({
  file,
  onClose,
}: {
  file: File;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState({ w: 612, h: 792 });
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>("select");
  const [h, setH] = useState<Hist>({ past: [], items: [], future: [] });
  const [ocr, setOcr] = useState<Record<number, OcrBlock[]>>({});
  const [ocrP, setOcrP] = useState<number | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState<Live>(null);
  const [color, setColor] = useState("#111111");
  const [fontSize, setFontSize] = useState(14);
  const [pen, setPen] = useState(2);
  const [exp, setExp] = useState<{
    status: "working" | "done" | "error";
    p: number;
    url?: string;
  } | null>(null);

  const bytes = useRef<Uint8Array | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ov = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    snap: Item[];
    moved: boolean;
  } | null>(null);

  const items = h.items;
  const W = size.w * zoom,
    H = size.h * zoom;
  const commit = useCallback(
    (next: Item[]) =>
      setH((s) => ({ past: [...s.past, s.items], items: next, future: [] })),
    [],
  );
  const undo = useCallback(
    () =>
      setH((s) =>
        s.past.length
          ? {
              past: s.past.slice(0, -1),
              items: s.past[s.past.length - 1],
              future: [s.items, ...s.future],
            }
          : s,
      ),
    [],
  );
  const redo = useCallback(
    () =>
      setH((s) =>
        s.future.length
          ? {
              past: [...s.past, s.items],
              items: s.future[0],
              future: s.future.slice(1),
            }
          : s,
      ),
    [],
  );
  const patch = (id: string, p: Partial<TextItem>) =>
    commit(
      items.map((i) => (i.id === id && i.kind === "text" ? { ...i, ...p } : i)),
    );
  const remove = useCallback(() => {
    if (sel) {
      commit(items.filter((i) => i.id !== sel));
      setSel(null);
    }
  }, [sel, items, commit]);

  // Load document
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        if (file.size > 250 * 1024 * 1024) throw new Error("large");
        bytes.current = new Uint8Array(await file.arrayBuffer());
        const d = await loadPdf(bytes.current);
        if (dead) return;
        setDoc(d);
      } catch (e) {
        if (!dead) setError(describeError(e));
      }
    })();
    return () => {
      dead = true;
    };
  }, [file]);

  // Render current page (only one at a time)
  useEffect(() => {
    if (!doc || !canvas.current) return;
    let dead = false;
    let task: Awaited<ReturnType<typeof renderPage>> | undefined;
    (async () => {
      try {
        const s = await getPageSize(doc, page);
        if (dead) return;
        setSize(s);
        task = await renderPage(
          doc,
          page,
          zoom * Math.min(window.devicePixelRatio || 1, 2),
          canvas.current!,
        );
        await task.promise;
      } catch (e) {
        if (
          (e as { name?: string })?.name !== "RenderingCancelledException" &&
          !dead
        )
          setError(describeError(e));
      }
    })();
    return () => {
      dead = true;
      task?.cancel();
    };
  }, [doc, page, zoom]);

  // Fit width on first load
  useEffect(() => {
    if (doc && scroller.current)
      getPageSize(doc, 0).then((s) =>
        setZoom(Math.min(1.5, (scroller.current!.clientWidth - 32) / s.w)),
      );
  }, [doc]);

  const fit = (mode: "width" | "page") => {
    const el = scroller.current;
    if (!el) return;
    const zw = (el.clientWidth - 32) / size.w,
      zh = (el.clientHeight - 32) / size.h;
    setZoom(mode === "width" ? zw : Math.min(zw, zh));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") remove();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, remove]);

  const blocks = (ocr[page] ?? []).filter(
    (b) => !items.some((i) => i.kind === "text" && i.srcId === b.id),
  );
  const selBlock = (ocr[page] ?? []).find((b) => b.id === sel);
  const selItem = items.find((i) => i.id === sel);
  useEffect(() => {
    if (selBlock) setDraft(selBlock.text);
    else if (selItem?.kind === "text") setDraft(selItem.text);
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const detect = async () => {
    if (!doc) return;
    setOcrP(0);
    const c = document.createElement("canvas");
    try {
      const task = await renderPage(doc, page, 2, c);
      await task.promise;
      const res = await runOcr(c, setOcrP);
      setOcr((o) => ({ ...o, [page]: res }));
      if (!res.length) alert("No text was detected on this page.");
    } catch {
      alert(
        "Text detection failed. Try a smaller document or a modern desktop browser.",
      );
    } finally {
      c.width = 0;
      c.height = 0; // release memory
      setOcrP(null);
    }
  };

  const apply = () => {
    if (selItem?.kind === "text") return patch(selItem.id, { text: draft });
    if (!selBlock || !canvas.current) return;
    const c = canvas.current;
    const pad = 0.002;
    const bx = selBlock.x - pad,
      bw = selBlock.width + pad * 2;
    const color0 = sampleBg(
      c,
      bx * c.width,
      selBlock.y * c.height,
      bw * c.width,
      selBlock.height * c.height,
    );
    const it: TextItem = {
      kind: "text",
      id: uid(),
      page,
      x: bx,
      y: selBlock.y,
      text: draft,
      size: Math.max(6, selBlock.height * size.h * 0.78),
      color: "#111111",
      bold: false,
      italic: false,
      cover: { w: bw, h: selBlock.height, color: color0 },
      srcId: selBlock.id,
    };
    commit([...items, it]);
    setSel(it.id);
  };

  const rel = (e: React.PointerEvent): [number, number] => {
    const r = ov.current!.getBoundingClientRect();
    return [
      clamp((e.clientX - r.left) / r.width),
      clamp((e.clientY - r.top) / r.height),
    ];
  };
  const onDown = (e: React.PointerEvent) => {
    const [x, y] = rel(e);
    if (tool === "text") {
      const it: TextItem = {
        kind: "text",
        id: uid(),
        page,
        x,
        y,
        text: "Text",
        size: fontSize,
        color,
        bold: false,
        italic: false,
      };
      commit([...items, it]);
      setSel(it.id);
      setTool("select");
    } else if (tool === "draw") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setLive({ kind: "draw", pts: [[x, y]] });
    } else if (tool === "highlight") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setLive({ kind: "hl", x0: x, y0: y, x1: x, y1: y });
    } else setSel(null);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!live) return;
    const [x, y] = rel(e);
    setLive(
      live.kind === "draw"
        ? { kind: "draw", pts: [...live.pts, [x, y]] }
        : { ...live, x1: x, y1: y },
    );
  };
  const onUp = () => {
    if (!live) return;
    if (live.kind === "draw" && live.pts.length > 1)
      commit([
        ...items,
        { kind: "draw", id: uid(), page, pts: live.pts, size: pen, color },
      ]);
    if (
      live.kind === "hl" &&
      Math.abs(live.x1 - live.x0) > 0.005 &&
      Math.abs(live.y1 - live.y0) > 0.003
    )
      commit([
        ...items,
        {
          kind: "hl",
          id: uid(),
          page,
          x: Math.min(live.x0, live.x1),
          y: Math.min(live.y0, live.y1),
          w: Math.abs(live.x1 - live.x0),
          h: Math.abs(live.y1 - live.y0),
        },
      ]);
    setLive(null);
  };

  const dragProps = (it: Item) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (tool !== "select" || it.kind === "draw") {
        if (tool === "select") {
          e.stopPropagation();
          setSel(it.id);
        }
        return;
      }
      e.stopPropagation();
      setSel(it.id);
      drag.current = {
        id: it.id,
        sx: e.clientX,
        sy: e.clientY,
        ox: it.x,
        oy: it.y,
        snap: items,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      d.moved = true;
      const nx = d.ox + (e.clientX - d.sx) / W,
        ny = d.oy + (e.clientY - d.sy) / H;
      setH((s) => ({
        ...s,
        items: s.items.map((i) =>
          i.id === d.id && i.kind !== "draw" ? { ...i, x: nx, y: ny } : i,
        ),
      }));
    },
    onPointerUp: () => {
      const d = drag.current;
      drag.current = null;
      if (d?.moved)
        setH((s) => ({
          past: [...s.past, d.snap],
          items: s.items,
          future: [],
        }));
    },
  });

  const download = async () => {
    if (!bytes.current) return;
    setExp({ status: "working", p: 0 });
    try {
      const out = await exportPdf(bytes.current, items, (p) =>
        setExp({ status: "working", p }),
      );
      const url = URL.createObjectURL(
        new Blob([out as BlobPart], { type: "application/pdf" }),
      );
      setExp({ status: "done", p: 1, url });
    } catch {
      setExp({ status: "error", p: 0 });
    }
  };

  if (error)
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <p role="alert" className="text-slate-800">
          {error}
        </p>
        <button className={`${btn} mt-4`} onClick={onClose}>
          Choose another file
        </button>
      </main>
    );

  const pageItems = items.filter((i) => i.page === page);
  const toolBtn = (t: Tool, label: string, icon: React.ReactNode) => (
    <button
      key={t}
      title={label}
      aria-pressed={tool === t}
      onClick={() => setTool(t)}
      className={`${btn} ${tool === t ? "!border-blue-600 !bg-blue-50 text-blue-700" : ""}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button
          className={btn}
          onClick={onClose}
          title="Close document"
          aria-label="Close document"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="mr-2 min-w-0">
          <div className="truncate text-sm font-medium">{file.name}</div>
          <div className="text-xs text-slate-500">
            {doc ? `${doc.numPages} pages` : "Loading PDF..."}
          </div>
        </div>
        {toolBtn("select", "Select", <MousePointer2 size={16} />)}
        {toolBtn("text", "+ Text", <Type size={16} />)}
        {toolBtn("draw", "Draw", <Pen size={16} />)}
        {toolBtn("highlight", "Highlight", <Highlighter size={16} />)}
        <button
          className={btn}
          onClick={undo}
          disabled={!h.past.length}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          className={btn}
          onClick={redo}
          disabled={!h.future.length}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>
        <button
          className={btn}
          onClick={detect}
          disabled={!doc || ocrP !== null}
          title="Run OCR on this page"
        >
          <ScanText size={16} />
          Detect Text
        </button>
        <button
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          onClick={download}
          disabled={!doc}
        >
          <Download size={16} />
          Download PDF
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
        <button
          className={btn}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          Page {page + 1} / {doc?.numPages ?? "–"}
        </span>
        <button
          className={btn}
          onClick={() =>
            setPage((p) => Math.min((doc?.numPages ?? 1) - 1, p + 1))
          }
          disabled={!doc || page >= doc.numPages - 1}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
        <span className="mx-2 text-slate-300">|</span>
        <button
          className={btn}
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          className={btn}
          onClick={() => setZoom((z) => Math.min(4, z + 0.1))}
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button className={btn} onClick={() => fit("width")}>
          Fit Width
        </button>
        <button className={btn} onClick={() => fit("page")}>
          Fit Page
        </button>
        <label className="ml-2 flex items-center gap-1">
          Color{" "}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Color"
          />
        </label>
        {tool === "text" && (
          <label className="flex items-center gap-1">
            Size{" "}
            <input
              type="number"
              min={6}
              max={96}
              value={fontSize}
              onChange={(e) => setFontSize(+e.target.value || 14)}
              className="w-14 rounded border border-slate-300 px-1"
            />
          </label>
        )}
        {tool === "draw" && (
          <label className="flex items-center gap-1">
            Pen{" "}
            <input
              type="range"
              min={1}
              max={12}
              value={pen}
              onChange={(e) => setPen(+e.target.value)}
            />
          </label>
        )}
        {tool === "draw" && (
          <button
            className={btn}
            onClick={() =>
              commit(
                items.filter((i) => !(i.kind === "draw" && i.page === page)),
              )
            }
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-auto bg-slate-200 p-4"
        >
          {!doc && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="animate-spin" size={18} />
              Loading PDF...
            </div>
          )}
          <div
            className="relative mx-auto bg-white shadow"
            style={{ width: W, height: H }}
          >
            <canvas
              ref={canvas}
              style={{ width: W, height: H }}
              className="absolute inset-0"
            />
            <div
              ref={ov}
              className="absolute inset-0 overflow-hidden"
              style={{
                touchAction: tool === "select" ? "auto" : "none",
                cursor: tool === "select" ? "default" : "crosshair",
              }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
            >
              {blocks.map((b) => (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Detected text: ${b.text}`}
                  title={b.text}
                  onPointerDown={(e) => {
                    if (tool === "select") {
                      e.stopPropagation();
                      setSel(b.id);
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && setSel(b.id)}
                  className={`absolute ${sel === b.id ? "border-2 border-blue-600 bg-blue-500/10" : "border border-dashed border-blue-400/70 hover:bg-blue-500/10"}`}
                  style={{
                    left: b.x * W,
                    top: b.y * H,
                    width: b.width * W,
                    height: b.height * H,
                    pointerEvents: tool === "select" ? "auto" : "none",
                  }}
                />
              ))}
              {pageItems
                .filter((i) => i.kind === "hl")
                .map(
                  (i) =>
                    i.kind === "hl" && (
                      <div
                        key={i.id}
                        {...dragProps(i)}
                        className={`absolute ${sel === i.id ? "outline outline-2 outline-blue-600" : ""}`}
                        style={{
                          left: i.x * W,
                          top: i.y * H,
                          width: i.w * W,
                          height: i.h * H,
                          background: "rgba(255,235,50,.4)",
                          pointerEvents: tool === "select" ? "auto" : "none",
                          cursor: "move",
                        }}
                      />
                    ),
                )}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={W}
                height={H}
              >
                {pageItems.map(
                  (i) =>
                    i.kind === "draw" && (
                      <polyline
                        key={i.id}
                        fill="none"
                        stroke={i.color}
                        strokeWidth={i.size * zoom}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={sel === i.id ? 0.6 : 1}
                        points={i.pts
                          .map(([x, y]) => `${x * W},${y * H}`)
                          .join(" ")}
                        style={{
                          pointerEvents: tool === "select" ? "stroke" : "none",
                        }}
                        onPointerDown={dragProps(i).onPointerDown}
                      />
                    ),
                )}
                {live?.kind === "draw" && (
                  <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth={pen * zoom}
                    strokeLinecap="round"
                    points={live.pts
                      .map(([x, y]) => `${x * W},${y * H}`)
                      .join(" ")}
                  />
                )}
              </svg>
              {live?.kind === "hl" && (
                <div
                  className="absolute"
                  style={{
                    left: Math.min(live.x0, live.x1) * W,
                    top: Math.min(live.y0, live.y1) * H,
                    width: Math.abs(live.x1 - live.x0) * W,
                    height: Math.abs(live.y1 - live.y0) * H,
                    background: "rgba(255,235,50,.4)",
                  }}
                />
              )}
              {pageItems.map(
                (i) =>
                  i.kind === "text" && (
                    <div
                      key={i.id}
                      {...dragProps(i)}
                      className={`absolute ${sel === i.id ? "outline outline-1 outline-blue-600" : ""}`}
                      style={{
                        left: i.x * W,
                        top: i.y * H,
                        fontSize: i.size * zoom,
                        lineHeight: 1.2,
                        whiteSpace: "pre",
                        color: i.color,
                        fontFamily: "Helvetica, Arial, sans-serif",
                        fontWeight: i.bold ? 700 : 400,
                        fontStyle: i.italic ? "italic" : "normal",
                        background: i.cover?.color,
                        minWidth: i.cover ? i.cover.w * W : undefined,
                        minHeight: i.cover ? i.cover.h * H : undefined,
                        pointerEvents: tool === "select" ? "auto" : "none",
                        cursor: "move",
                      }}
                    >
                      {i.text}
                    </div>
                  ),
              )}
            </div>
          </div>
        </div>

        <aside
          className="max-h-64 w-full shrink-0 overflow-auto border-t border-slate-200 bg-white p-4 lg:max-h-none lg:w-72 lg:border-l lg:border-t-0"
          aria-label="Properties"
        >
          {ocrP !== null && (
            <div className="mb-4" role="status">
              <p className="text-sm font-medium">Detecting text...</p>
              <div className="mt-2 h-2 rounded bg-slate-200">
                <div
                  className="h-2 rounded bg-blue-600"
                  style={{ width: `${Math.round(ocrP * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {Math.round(ocrP * 100)}%
              </p>
            </div>
          )}
          {selBlock || selItem?.kind === "text" ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Selected text</h2>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="w-full rounded border border-slate-300 p-2 text-sm"
                aria-label="Text"
              />
              <button
                className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={apply}
              >
                Apply
              </button>
              {selItem?.kind === "text" && (
                <>
                  <label className="flex items-center justify-between text-sm">
                    Font size
                    <input
                      type="number"
                      min={4}
                      max={120}
                      step={0.5}
                      value={Math.round(selItem.size * 10) / 10}
                      onChange={(e) =>
                        patch(selItem.id, {
                          size: +e.target.value || selItem.size,
                        })
                      }
                      className="w-20 rounded border border-slate-300 px-1"
                    />
                  </label>
                  <label className="flex items-center justify-between text-sm">
                    Color
                    <input
                      type="color"
                      value={selItem.color}
                      onChange={(e) =>
                        patch(selItem.id, { color: e.target.value })
                      }
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      className={`${btn} font-bold ${selItem.bold ? "!bg-blue-50" : ""}`}
                      aria-pressed={selItem.bold}
                      onClick={() => patch(selItem.id, { bold: !selItem.bold })}
                    >
                      B
                    </button>
                    <button
                      className={`${btn} italic ${selItem.italic ? "!bg-blue-50" : ""}`}
                      aria-pressed={selItem.italic}
                      onClick={() =>
                        patch(selItem.id, { italic: !selItem.italic })
                      }
                    >
                      I
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Drag the text on the page to reposition it. Font matching is
                    approximate.
                  </p>
                </>
              )}
              {selItem && (
                <button className={btn} onClick={remove}>
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          ) : selItem ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">
                {selItem.kind === "hl" ? "Highlight" : "Drawing"}
              </h2>
              <button className={btn} onClick={remove}>
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {ocr[page]
                ? "Click a detected text box to edit it, or use the tools above."
                : "Click Detect Text to find editable text on this page, or add text, draw and highlight with the tools above."}
            </p>
          )}
        </aside>
      </div>

      {exp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Export"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            {exp.status === "working" && (
              <>
                <p className="font-medium">Preparing your PDF...</p>
                <div className="mt-3 h-2 rounded bg-slate-200">
                  <div
                    className="h-2 rounded bg-blue-600"
                    style={{ width: `${Math.round(exp.p * 100)}%` }}
                  />
                </div>
              </>
            )}
            {exp.status === "done" && (
              <>
                <p className="font-medium">Your PDF is ready.</p>
                <a
                  href={exp.url}
                  download="document-edited.pdf"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Download size={16} />
                  Download PDF
                </a>
              </>
            )}
            {exp.status === "error" && (
              <p role="alert">
                The PDF could not be created in your browser. Try a smaller
                document.
              </p>
            )}
            {exp.status !== "working" && (
              <button
                className={`${btn} mt-4 ml-2`}
                onClick={() => {
                  if (exp.url) URL.revokeObjectURL(exp.url);
                  setExp(null);
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
