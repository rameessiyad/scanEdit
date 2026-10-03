"use client";
import { useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPage } from "@/lib/pdf/pdfRenderer";

export default function PdfThumbnail({
  doc,
  index,
  rot = 0,
}: {
  doc: PDFDocumentProxy;
  index: number;
  rot?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    let task: Awaited<ReturnType<typeof renderPage>> | undefined;
    const io = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        try {
          task = await renderPage(doc, index, 0.3, c);
          await task.promise;
        } catch {
          /* cancelled */
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(c);
    return () => {
      io.disconnect();
      task?.cancel();
    };
  }, [doc, index]);
  return (
    <div className="flex h-48 items-center justify-center overflow-hidden">
      <canvas
        ref={ref}
        className="max-h-44 max-w-full bg-white shadow transition-transform"
        style={{ transform: `rotate(${rot}deg)` }}
      />
    </div>
  );
}
