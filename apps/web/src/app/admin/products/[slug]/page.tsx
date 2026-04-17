import { ProductDetailPageClient } from "@/components/admin/catalog/products/product-detail-page-client";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ProductDetailPageClient slug={slug} />;
}
