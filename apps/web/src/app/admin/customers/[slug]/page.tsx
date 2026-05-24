import { CustomerDetailPageClient } from "@/components/admin/customers/customer-detail-page-client";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CustomerDetailPageClient slug={slug} />;
}
