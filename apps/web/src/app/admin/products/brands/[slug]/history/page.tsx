import { BrandHistoryPageClient } from "@/components/admin/catalog/history";

export default async function AdminBrandHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BrandHistoryPageClient slug={slug} />;
}
