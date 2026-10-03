import { notFound } from "next/navigation";
import SiteHeader from "@/components/ui/SiteHeader";
import PageTool from "@/components/tools/PageTool";
import { PAGE_TOOLS, type PageToolSlug } from "@/lib/tools";

export function generateStaticParams() {
  return PAGE_TOOLS.map((tool) => ({ tool }));
}
export const dynamicParams = false;

export default async function Page({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  if (!(PAGE_TOOLS as readonly string[]).includes(tool)) notFound();
  return (
    <>
      <SiteHeader />
      <PageTool tool={tool as PageToolSlug} />
    </>
  );
}
