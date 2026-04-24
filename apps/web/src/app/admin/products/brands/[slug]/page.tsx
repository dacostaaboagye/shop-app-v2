import { BrandDetailPageClient } from "@/components/admin/catalog/brands/brand-detail-page-client";

export default async function AdminBrandDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BrandDetailPageClient slug={slug} />;
}
