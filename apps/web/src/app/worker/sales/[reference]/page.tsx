import { WorkerInvoiceDetailPageClient } from "@/components/worker/sales/invoice-detail-page-client";

export default async function WorkerInvoicePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <WorkerInvoiceDetailPageClient reference={decodeURIComponent(reference)} />;
}
