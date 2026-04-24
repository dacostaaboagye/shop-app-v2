import { SupplierDetailPageClient } from "@/components/admin/suppliers/supplier-detail-page-client";

export default async function AdminSupplierDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SupplierDetailPageClient slug={slug} />;
}
