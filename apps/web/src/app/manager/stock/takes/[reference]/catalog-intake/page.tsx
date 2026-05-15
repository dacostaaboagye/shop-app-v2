import { StockTakeCatalogIntakePageClient } from "@/components/stock/stock-take-catalog-intake-page-client";

export default async function ManagerStockTakeCatalogIntakePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <StockTakeCatalogIntakePageClient
      portal="manager"
      reference={decodeURIComponent(reference)}
    />
  );
}
