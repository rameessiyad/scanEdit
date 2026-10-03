import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Free Scanned PDF Editor — Edit PDF Online Without Uploading",
  description:
    "Edit scanned PDFs directly in your browser with OCR. No login, no credits, and no file uploads. Free PDF editing with privacy-first client-side processing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
