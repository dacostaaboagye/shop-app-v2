import { AdminInvoiceDetailPageClient } from "@/components/admin/invoices/admin-invoice-detail-page-client";

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <AdminInvoiceDetailPageClient reference={reference} />;
}
