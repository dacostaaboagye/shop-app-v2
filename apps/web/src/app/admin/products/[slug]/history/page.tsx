import { ProductHistoryPageClient } from "@/components/admin/catalog/history";

export default async function AdminProductHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ProductHistoryPageClient slug={slug} />;
}
