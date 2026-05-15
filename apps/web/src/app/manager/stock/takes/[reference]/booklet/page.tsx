import { StockTakeBookletPageClient } from "@/components/stock/stock-take-booklet-page-client";

export default async function ManagerStockTakeBookletPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <StockTakeBookletPageClient
      portal="manager"
      reference={decodeURIComponent(reference)}
    />
  );
}
