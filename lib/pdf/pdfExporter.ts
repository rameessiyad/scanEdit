import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Item } from "@/lib/types/editor";

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
// Built-in PDF fonts only cover Latin-1; replace anything else instead of crashing.
const safe = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "?");

export async function exportPdf(
  bytes: Uint8Array,
  items: Item[],
  onProgress: (p: number) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const fonts = {
    r: await doc.embedFont(StandardFonts.Helvetica),
    b: await doc.embedFont(StandardFonts.HelveticaBold),
    i: await doc.embedFont(StandardFonts.HelveticaOblique),
    bi: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const pages = doc.getPages();
  items.forEach((it, idx) => {
    const page = pages[it.page];
    if (!page) return;
    const { width: pw, height: ph } = page.getSize();
    if (it.kind === "hl") {
      page.drawRectangle({
        x: it.x * pw,
        y: ph - (it.y + it.h) * ph,
        width: it.w * pw,
        height: it.h * ph,
        color: rgb(1, 0.92, 0.2),
        opacity: 0.4,
      });
    } else if (it.kind === "draw") {
      for (let k = 1; k < it.pts.length; k++)
        page.drawLine({
          start: { x: it.pts[k - 1][0] * pw, y: ph - it.pts[k - 1][1] * ph },
          end: { x: it.pts[k][0] * pw, y: ph - it.pts[k][1] * ph },
          thickness: it.size,
          color: hex(it.color),
          lineCap: 1,
        });
    } else {
      if (it.cover)
        page.drawRectangle({
          x: it.x * pw,
          y: ph - (it.y + it.cover.h) * ph,
          width: it.cover.w * pw,
          height: it.cover.h * ph,
          color: hex(it.cover.color),
        });
      const font =
        fonts[it.bold ? (it.italic ? "bi" : "b") : it.italic ? "i" : "r"];
      safe(it.text)
        .split("\n")
        .forEach((line, n) =>
          page.drawText(line, {
            x: it.x * pw,
            y: ph - it.y * ph - it.size * (0.856 + 1.2 * n),
            size: it.size,
            font,
            color: hex(it.color),
          }),
        );
    }
    onProgress((idx + 1) / items.length);
  });
  return doc.save();
}
