import { toNumericAmount } from "@/lib/money/format-money";

type SaleLike = {
  totalAmount: string | number | null;
  type: string;
};

type StockLike = {
  availableQuantity: number;
};

type TransferLike = {
  status: string;
};

export function getManagerDashboardMetrics(args: {
  sales: readonly SaleLike[];
  stock: readonly StockLike[];
  transfers: readonly TransferLike[];
}) {
  const lowStockCount = args.stock.filter(
    (item) => item.availableQuantity <= 5,
  ).length;
  const openTransferCount = args.transfers.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "approved" ||
      item.status === "dispatched",
  ).length;
  const todaysRevenue = args.sales.reduce(
    (sum, item) =>
      item.type === "pos" && item.totalAmount != null
        ? sum + (toNumericAmount(item.totalAmount) ?? 0)
        : sum,
    0,
  );
  const transactionCount = args.sales.length;

  return {
    averageSaleValue:
      transactionCount > 0 ? todaysRevenue / transactionCount : 0,
    lowStockCount,
    openTransferCount,
    skuCount: args.stock.length,
    todaysRevenue,
    transactionCount,
  };
}
