import { createWorker } from "tesseract.js";
import type { OcrBlock } from "@/lib/types/editor";

interface Line {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}
interface Block {
  paragraphs: { lines: Line[] }[];
}

/** Runs Tesseract in its own Web Worker. Returns line boxes normalised to 0–1. */
export async function runOcr(
  canvas: HTMLCanvasElement,
  onProgress: (p: number) => void,
): Promise<OcrBlock[]> {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(canvas, {}, { blocks: true });
    const out: OcrBlock[] = [];
    let n = 0;
    for (const b of (data.blocks ?? []) as unknown as Block[])
      for (const p of b.paragraphs)
        for (const l of p.lines) {
          const text = l.text.trim();
          if (!text || l.confidence < 30) continue;
          out.push({
            id: `ocr-${n++}`,
            text,
            x: l.bbox.x0 / canvas.width,
            y: l.bbox.y0 / canvas.height,
            width: (l.bbox.x1 - l.bbox.x0) / canvas.width,
            height: (l.bbox.y1 - l.bbox.y0) / canvas.height,
            confidence: l.confidence,
          });
        }
    return out;
  } finally {
    await worker.terminate();
  }
}
