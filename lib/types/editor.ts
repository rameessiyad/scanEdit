export type Tool = "select" | "text" | "draw" | "highlight";

/** Normalised (0–1) box relative to the page. */
export interface OcrBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}
interface Base {
  id: string;
  page: number;
}
export interface TextItem extends Base {
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number; // PDF points
  color: string;
  bold: boolean;
  italic: boolean;
  cover?: { w: number; h: number; color: string }; // hides the scan underneath
  srcId?: string; // OCR block this edit replaces
}
export interface DrawItem extends Base {
  kind: "draw";
  pts: [number, number][];
  size: number;
  color: string;
}
export interface HlItem extends Base {
  kind: "hl";
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Item = TextItem | DrawItem | HlItem;
