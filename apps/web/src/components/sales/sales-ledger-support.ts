import type { InvoiceListResponse, PosPaymentMethod } from "@shop/contracts";
import { format, parseISO, subDays } from "date-fns";
import { toNumericAmount } from "@/lib/money/format-money";

export type SalesLedgerRecord = InvoiceListResponse["items"][number] & {
  locationName?: string;
  locationSlug?: string;
};

export type SalesLedgerFilters = {
  paymentMethod: "all" | PosPaymentMethod;
  search: string;
};

export type SalesLedgerDay = {
  averageReceiptAmount: number;
  creditNoteAmount: number;
  creditNoteCount: number;
  dateKey: string;
  displayDate: string;
  grossSalesAmount: number;
  netRevenueAmount: number;
  receiptCount: number;
  transactionCount: number;
};

export type SalesLedgerSummary = {
  averageReceiptAmount: number;
  creditNoteAmount: number;
  creditNoteCount: number;
  grossSalesAmount: number;
  netRevenueAmount: number;
  receiptCount: number;
  timelineDays: SalesLedgerDay[];
  transactionCount: number;
};

export type SalesLedgerLocationSummary = {
  locationName: string;
  locationSlug: string;
  netRevenueAmount: number;
  transactionCount: number;
};

export function createDefaultSalesLedgerDateRange(today = new Date()) {
  return {
    dateFrom: format(subDays(today, 29), "yyyy-MM-dd"),
    dateTo: format(today, "yyyy-MM-dd"),
  };
}

export function getSalesLedgerPaymentOptions(records: SalesLedgerRecord[]) {
  const values = new Set<PosPaymentMethod>();

  for (const record of records) {
    if (record.paymentMethod) {
      values.add(record.paymentMethod);
    }
  }

  return Array.from(values).sort();
}

export function filterSalesLedgerRecords(
  records: SalesLedgerRecord[],
  filters: SalesLedgerFilters,
) {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return records.filter((record) => {
    if (
      filters.paymentMethod !== "all" &&
      record.paymentMethod !== filters.paymentMethod
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      record.reference,
      record.customerName,
      record.customerEmail,
      record.attributedWorkerName,
      record.locationName,
      record.locationSlug,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedSearch));
  });
}

export function summarizeSalesLedger(
  records: SalesLedgerRecord[],
): SalesLedgerSummary {
  const dayMap = new Map<string, SalesLedgerDay>();

  for (const record of records) {
    const dayKey = toDayKey(record.createdAt);
    const day = dayMap.get(dayKey) ?? {
      averageReceiptAmount: 0,
      creditNoteAmount: 0,
      creditNoteCount: 0,
      dateKey: dayKey,
      displayDate: format(parseISO(dayKey), "EEE, dd MMM"),
      grossSalesAmount: 0,
      netRevenueAmount: 0,
      receiptCount: 0,
      transactionCount: 0,
    };
    const totalAmount = toNumericAmount(record.totalAmount) ?? 0;
    const isCreditNote = record.type === "credit_note";

    day.transactionCount += 1;

    if (isCreditNote) {
      day.creditNoteAmount += totalAmount;
      day.creditNoteCount += 1;
      day.netRevenueAmount -= totalAmount;
    } else {
      day.grossSalesAmount += totalAmount;
      day.netRevenueAmount += totalAmount;
      day.receiptCount += 1;
    }

    day.averageReceiptAmount =
      day.receiptCount > 0 ? day.grossSalesAmount / day.receiptCount : 0;

    dayMap.set(dayKey, day);
  }

  const timelineDays = Array.from(dayMap.values()).sort((left, right) =>
    left.dateKey.localeCompare(right.dateKey),
  );

  const grossSalesAmount = timelineDays.reduce(
    (sum, day) => sum + day.grossSalesAmount,
    0,
  );
  const creditNoteAmount = timelineDays.reduce(
    (sum, day) => sum + day.creditNoteAmount,
    0,
  );
  const receiptCount = timelineDays.reduce(
    (sum, day) => sum + day.receiptCount,
    0,
  );
  const transactionCount = timelineDays.reduce(
    (sum, day) => sum + day.transactionCount,
    0,
  );

  return {
    averageReceiptAmount:
      receiptCount > 0 ? grossSalesAmount / receiptCount : 0,
    creditNoteAmount,
    creditNoteCount: timelineDays.reduce(
      (sum, day) => sum + day.creditNoteCount,
      0,
    ),
    grossSalesAmount,
    netRevenueAmount: grossSalesAmount - creditNoteAmount,
    receiptCount,
    timelineDays,
    transactionCount,
  };
}

export function summarizeSalesLedgerByLocation(
  records: SalesLedgerRecord[],
): SalesLedgerLocationSummary[] {
  const locationMap = new Map<string, SalesLedgerLocationSummary>();

  for (const record of records) {
    if (!record.locationSlug || !record.locationName) {
      continue;
    }

    const key = record.locationSlug;
    const current = locationMap.get(key) ?? {
      locationName: record.locationName,
      locationSlug: record.locationSlug,
      netRevenueAmount: 0,
      transactionCount: 0,
    };
    const totalAmount = toNumericAmount(record.totalAmount) ?? 0;

    current.transactionCount += 1;
    current.netRevenueAmount +=
      record.type === "credit_note" ? -totalAmount : totalAmount;

    locationMap.set(key, current);
  }

  return Array.from(locationMap.values()).sort(
    (left, right) => right.netRevenueAmount - left.netRevenueAmount,
  );
}

function toDayKey(value: string) {
  return format(parseISO(value), "yyyy-MM-dd");
}
