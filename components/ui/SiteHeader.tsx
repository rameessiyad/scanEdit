import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-semibold text-slate-900">
          ScanEdit
        </Link>
        <nav className="flex gap-5 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900">
            Editor
          </Link>
          <Link href="/tools" className="hover:text-slate-900">
            Tools
          </Link>
        </nav>
      </div>
    </header>
  );
}
