import { ManagerManualInvoiceRequestDetailPageClient } from "@/components/manager/invoices/manager-manual-invoice-request-detail-page-client";

export default async function ManagerManualInvoiceRequestDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <ManagerManualInvoiceRequestDetailPageClient reference={reference} />;
}
