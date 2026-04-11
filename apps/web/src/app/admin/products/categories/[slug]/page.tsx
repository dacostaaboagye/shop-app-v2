import { CategoryDetailPageClient } from "@/components/admin/catalog/categories/category-detail-page-client";

export default async function AdminCategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <CategoryDetailPageClient slug={slug} />;
}
