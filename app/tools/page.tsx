import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/ui/SiteHeader";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Free PDF Tools — Merge, Split, Rotate and Organize PDFs | ScanEdit",
  description:
    "Free PDF tools that run in your browser. No login, no credits, and your files never leave your device.",
};
const cats = ["Edit", "Organize", "Convert", "Optimize"] as const;

export default function ToolsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">PDF Tools</h1>
        <p className="mt-2 text-slate-600">
          Your documents stay on your device.
        </p>
        {cats.map((cat) => (
          <section key={cat} className="mt-10">
            <h2 className="text-lg font-semibold">{cat}</h2>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.filter((t) => t.cat === cat).map(
                ({ slug, name, desc, href, Icon }) => (
                  <li
                    key={slug}
                    className="flex flex-col rounded-lg border border-slate-200 bg-white p-5"
                  >
                    <Icon size={22} className="text-blue-600" aria-hidden />
                    <h3 className="mt-3 font-medium">{name}</h3>
                    <p className="mt-1 flex-1 text-sm text-slate-600">{desc}</p>
                    {href ? (
                      <Link
                        href={href}
                        className="mt-4 inline-block rounded-md border border-slate-300 px-3 py-1.5 text-center text-sm font-medium hover:bg-slate-100"
                      >
                        Open Tool →
                      </Link>
                    ) : (
                      <span className="mt-4 text-sm text-slate-400">
                        Coming soon
                      </span>
                    )}
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
