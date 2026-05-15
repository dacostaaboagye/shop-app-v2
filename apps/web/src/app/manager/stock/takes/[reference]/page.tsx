import { StockTakeReviewPageClient } from "@/components/stock/stock-take-review-page-client";

export default async function ManagerStockTakeReviewPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <StockTakeReviewPageClient
      portal="manager"
      reference={decodeURIComponent(reference)}
    />
  );
}
