import type { LucideIcon } from "lucide-react";
import {
  ArrowUpDown,
  FilePen,
  FileOutput,
  FileText,
  Highlighter,
  ImagePlus,
  Images,
  Maximize,
  Merge,
  Minimize2,
  PenLine,
  RotateCw,
  ScanText,
  Scissors,
  Tags,
  Trash2,
  Type,
} from "lucide-react";

export interface ToolDef {
  slug: string;
  name: string;
  desc: string;
  cat: "Edit" | "Organize" | "Convert" | "Optimize";
  Icon: LucideIcon;
  href?: string;
}

const p = (slug: string) => `/tools/${slug}`;
export const TOOLS: ToolDef[] = [
  {
    slug: "edit",
    name: "Edit PDF",
    desc: "Edit text, add text, draw and highlight.",
    cat: "Edit",
    Icon: FilePen,
    href: "/",
  },
  {
    slug: "scanned",
    name: "Edit Scanned PDF",
    desc: "Detect text with OCR and edit it.",
    cat: "Edit",
    Icon: ScanText,
    href: "/",
  },
  {
    slug: "addtext",
    name: "Add Text",
    desc: "Place new text anywhere on a page.",
    cat: "Edit",
    Icon: Type,
    href: "/",
  },
  {
    slug: "sign",
    name: "Sign PDF",
    desc: "Draw your signature on a document.",
    cat: "Edit",
    Icon: PenLine,
    href: "/",
  },
  {
    slug: "highlight",
    name: "Highlight PDF",
    desc: "Highlight important areas.",
    cat: "Edit",
    Icon: Highlighter,
    href: "/",
  },
  {
    slug: "merge",
    name: "Merge PDF",
    desc: "Combine multiple PDFs into one document.",
    cat: "Organize",
    Icon: Merge,
    href: p("merge"),
  },
  {
    slug: "split",
    name: "Split PDF",
    desc: "Split by page, selection or ranges.",
    cat: "Organize",
    Icon: Scissors,
    href: p("split"),
  },
  {
    slug: "extract",
    name: "Extract Pages",
    desc: "Pick pages and save them as a new PDF.",
    cat: "Organize",
    Icon: FileOutput,
    href: p("extract"),
  },
  {
    slug: "delete",
    name: "Delete Pages",
    desc: "Remove pages you don't need.",
    cat: "Organize",
    Icon: Trash2,
    href: p("delete"),
  },
  {
    slug: "reorder",
    name: "Reorder Pages",
    desc: "Drag pages into a new order.",
    cat: "Organize",
    Icon: ArrowUpDown,
    href: p("reorder"),
  },
  {
    slug: "rotate",
    name: "Rotate PDF",
    desc: "Rotate selected or all pages.",
    cat: "Organize",
    Icon: RotateCw,
    href: p("rotate"),
  },
  {
    slug: "img2pdf",
    name: "Images to PDF",
    desc: "Turn JPG, PNG and WEBP into a PDF.",
    cat: "Convert",
    Icon: ImagePlus,
  },
  {
    slug: "pdf2img",
    name: "PDF to Images",
    desc: "Export pages as PNG or JPG.",
    cat: "Convert",
    Icon: Images,
  },
  {
    slug: "pdf2txt",
    name: "PDF to Text",
    desc: "Extract text, with OCR for scans.",
    cat: "Convert",
    Icon: FileText,
  },
  {
    slug: "compress",
    name: "Compress PDF",
    desc: "Reduce file size in your browser.",
    cat: "Optimize",
    Icon: Minimize2,
  },
  {
    slug: "resize",
    name: "Resize PDF Pages",
    desc: "Normalize pages to A4, Letter and more.",
    cat: "Optimize",
    Icon: Maximize,
  },
  {
    slug: "metadata",
    name: "PDF Metadata",
    desc: "Edit title, author, subject and keywords.",
    cat: "Optimize",
    Icon: Tags,
  },
];
export const PAGE_TOOLS = [
  "merge",
  "split",
  "extract",
  "delete",
  "reorder",
  "rotate",
] as const;
export type PageToolSlug = (typeof PAGE_TOOLS)[number];
