import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  // slice(): pdf.js transfers the buffer; keep the original bytes intact for export.
  return pdfjs.getDocument({ data: bytes.slice() }).promise;
}

export async function getPageSize(doc: PDFDocumentProxy, index: number) {
  const v = (await doc.getPage(index + 1)).getViewport({ scale: 1 });
  return { w: v.width, h: v.height };
}

/** Render a page into a canvas at the given pixel scale. Caller may cancel the task. */
export async function renderPage(
  doc: PDFDocumentProxy,
  index: number,
  scale: number,
  canvas: HTMLCanvasElement,
): Promise<RenderTask> {
  const page = await doc.getPage(index + 1);
  const vp = page.getViewport({ scale });
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  return page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp });
}

export function describeError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "PasswordException")
    return "This PDF is password-protected. Remove the password and try again.";
  if (name === "InvalidPDFException" || name === "FormatError")
    return "This file isn't a valid PDF, or it is corrupted.";
  return "This PDF could not be processed in your browser. Try a smaller document or a modern desktop browser.";
}
