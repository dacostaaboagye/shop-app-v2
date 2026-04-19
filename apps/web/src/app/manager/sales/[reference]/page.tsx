import { ManagerInvoiceDetailPageClient } from "@/components/manager/sales/manager-invoice-detail-page-client";

export default async function ManagerInvoicePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <ManagerInvoiceDetailPageClient
      reference={decodeURIComponent(reference)}
    />
  );
}
