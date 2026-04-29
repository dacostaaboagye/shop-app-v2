import type {
  AdminStockBalanceSummary,
  ManagerDashboardSalesSummary,
  ManagerDashboardTransferSummary,
  StockSupplyRequestResponse,
} from "@shop/contracts";
import type { InvoiceRecord } from "../sales/sales.contracts.js";
import { toInvoiceResponse } from "../sales/invoice-response.mapper.js";
import { toRequestResponse } from "../stock/supply-request-route-support.js";

const DASHBOARD_PAGE_SIZE = 100;
const ACTIVE_TRANSFER_STATUSES = new Set(["pending", "approved", "dispatched"]);

export async function listAllManagerSales(
  invoiceRepository: {
    listByLocation(input: {
      classification?: "internal" | "outgoing";
      dateFrom?: Date;
      dateTo?: Date;
      documentType?: "adjusted" | "credit_note" | "invoice";
      locationId: string;
      page: number;
      pageSize: number;
      q?: string;
      workerId?: string;
    }): Promise<{ items: InvoiceRecord[]; total: number }>;
  },
  input: { dateFrom: Date; locationId: string },
) {
  const firstPage = await invoiceRepository.listByLocation({
    classification: "outgoing",
    dateFrom: input.dateFrom,
    locationId: input.locationId,
    page: 1,
    pageSize: DASHBOARD_PAGE_SIZE,
  });
  const totalPages = Math.max(
    1,
    Math.ceil(firstPage.total / DASHBOARD_PAGE_SIZE),
  );

  if (totalPages === 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      invoiceRepository.listByLocation({
        classification: "outgoing",
        dateFrom: input.dateFrom,
        locationId: input.locationId,
        page: index + 2,
        pageSize: DASHBOARD_PAGE_SIZE,
      }),
    ),
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((response) => response.items),
  ];
}

export async function listAllLocationStockBalances(
  stockBalanceQueryRepo: {
    listStockBalancesByLocationId(input: {
      locationId: string;
      page: number;
      pageSize: number;
      q: string;
    }): Promise<{
      items: AdminStockBalanceSummary[];
      locationName: string | null;
      totalCount: number;
    }>;
  },
  locationId: string,
) {
  const firstPage = await stockBalanceQueryRepo.listStockBalancesByLocationId({
    locationId,
    page: 1,
    pageSize: DASHBOARD_PAGE_SIZE,
    q: "",
  });
  const totalPages = Math.max(
    1,
    Math.ceil(firstPage.totalCount / DASHBOARD_PAGE_SIZE),
  );

  if (totalPages === 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      stockBalanceQueryRepo.listStockBalancesByLocationId({
        locationId,
        page: index + 2,
        pageSize: DASHBOARD_PAGE_SIZE,
        q: "",
      }),
    ),
  );

  return {
    items: [
      ...firstPage.items,
      ...remainingPages.flatMap((response) => response.items),
    ],
    locationName: firstPage.locationName,
    totalCount: firstPage.totalCount,
  };
}

export async function listAllLocationTransfers(
  supplyRequestRepository: {
    listByLocation(input: {
      locationId: string;
      page: number;
      pageSize: number;
      status?: string;
    }): Promise<{
      items: Array<Parameters<typeof toRequestResponse>[0]>;
      total: number;
    }>;
  },
  locationId: string,
): Promise<StockSupplyRequestResponse[]> {
  const firstPage = await supplyRequestRepository.listByLocation({
    locationId,
    page: 1,
    pageSize: DASHBOARD_PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(firstPage.total / DASHBOARD_PAGE_SIZE));

  if (totalPages === 1) {
    return firstPage.items.map(toTransferResponse);
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      supplyRequestRepository.listByLocation({
        locationId,
        page: index + 2,
        pageSize: DASHBOARD_PAGE_SIZE,
      }),
    ),
  );

  return [
    ...firstPage.items.map(toTransferResponse),
    ...remainingPages.flatMap((response) =>
      response.items.map(toTransferResponse),
    ),
  ];
}

export function summarizeManagerSales(
  sales: InvoiceRecord[],
): ManagerDashboardSalesSummary {
  const posSales = sales.filter((item) => item.type === "pos");
  const todaysRevenue = posSales.reduce(
    (sum, item) => sum + Number(item.totalAmount),
    0,
  );
  const transactionCount = posSales.length;

  return {
    averageSaleValue:
      transactionCount > 0 ? todaysRevenue / transactionCount : 0,
    latestSales: sales
      .slice(0, 5)
      .map((item) => toInvoiceResponse({ ...item, lines: [] })),
    todaysRevenue,
    transactionCount,
  };
}

export function summarizeManagerInventory(stock: AdminStockBalanceSummary[]) {
  return {
    lowStockCount: stock.filter((item) => item.availableQuantity <= 5).length,
    skuCount: stock.length,
  };
}

export function summarizeManagerTransfers(
  transfers: StockSupplyRequestResponse[],
): ManagerDashboardTransferSummary {
  const activeTransfers = transfers.filter((item) =>
    ACTIVE_TRANSFER_STATUSES.has(item.status),
  );

  return {
    activeTransfers: activeTransfers.slice(0, 4),
    openTransferCount: activeTransfers.length,
  };
}

export function toTodayStart(today = new Date()) {
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
}

function toTransferResponse(
  row: Parameters<typeof toRequestResponse>[0],
): StockSupplyRequestResponse {
  const response = toRequestResponse(row);

  return {
    ...response,
    status: response.status as StockSupplyRequestResponse["status"],
  };
}
