import { PDFDocument, degrees } from "pdf-lib";

export interface PageRef {
  id: string;
  src: number;
  index: number;
  rot: number;
}

/** Build a new PDF from pages of one or more source PDFs. Sources are never modified. */
export async function buildPdf(
  sources: Uint8Array[],
  pages: PageRef[],
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const loaded = new Map<number, PDFDocument>();
  for (const p of pages) {
    if (!loaded.has(p.src))
      loaded.set(p.src, await PDFDocument.load(sources[p.src]));
    const [pg] = await out.copyPages(loaded.get(p.src)!, [p.index]);
    if (p.rot) pg.setRotation(degrees((pg.getRotation().angle + p.rot) % 360));
    out.addPage(pg);
  }
  return out.save();
}

/** "1-3, 5, 7-10" → [[0,1,2],[4],[6,7,8,9]] (zero-based, one group per output file). */
export function parseRanges(s: string, max: number): number[][] {
  const groups = s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const [a, b] = t.split("-").map(Number);
      const hi = b ?? a;
      if (!(a >= 1 && hi >= a && hi <= max))
        throw new Error(
          `"${t}" is not a valid range for a ${max}-page document.`,
        );
      return Array.from({ length: hi - a + 1 }, (_, i) => a + i - 1);
    });
  if (!groups.length)
    throw new Error("Enter at least one page or range, e.g. 1-3, 5");
  return groups;
}
