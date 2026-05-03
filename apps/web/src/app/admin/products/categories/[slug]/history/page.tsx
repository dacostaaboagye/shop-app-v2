import { CategoryHistoryPageClient } from "@/components/admin/catalog/history";

export default async function AdminCategoryHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <CategoryHistoryPageClient slug={slug} />;
}
