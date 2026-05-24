import { AdminManualInvoiceRequestDetailPageClient } from "@/components/admin/invoices/admin-manual-invoice-request-detail-page-client";

export default async function AdminManualInvoiceRequestDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <AdminManualInvoiceRequestDetailPageClient reference={reference} />;
}
