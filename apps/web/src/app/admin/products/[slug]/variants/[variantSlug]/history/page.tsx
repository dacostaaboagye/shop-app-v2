import { VariantHistoryPageClient } from "@/components/admin/catalog/history";

export default async function AdminVariantHistoryPage({
  params,
}: {
  params: Promise<{ slug: string; variantSlug: string }>;
}) {
  const { slug, variantSlug } = await params;

  return (
    <VariantHistoryPageClient productSlug={slug} variantSlug={variantSlug} />
  );
}
