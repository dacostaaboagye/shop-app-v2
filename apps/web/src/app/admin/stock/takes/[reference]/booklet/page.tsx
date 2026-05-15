import { StockTakeBookletPageClient } from "@/components/stock/stock-take-booklet-page-client";

export default async function AdminStockTakeBookletPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <StockTakeBookletPageClient
      portal="admin"
      reference={decodeURIComponent(reference)}
    />
  );
}
