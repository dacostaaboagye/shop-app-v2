"use client";

import type {
  AdminInvoiceReportingTotals,
  InvoiceDocumentTypeFilter,
} from "@shop/contracts";
import { ArrowDownRight, Receipt, TrendingUp, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AppPagination } from "@/components/data-table/app-pagination";
import { StatCard } from "@/components/system/page-shell";
import type { MoneyProfile } from "@/lib/money/format-money";
import { formatMoney } from "@/lib/money/format-money";
import { SalesLedgerDayTable } from "./sales-ledger-day-table";
import { SalesLedgerFilters } from "./sales-ledger-filters";
import { SalesLedgerLocationPanel } from "./sales-ledger-location-panel";
import {
  createDefaultSalesLedgerDateRange,
  filterSalesLedgerRecords,
  getSalesLedgerPaymentOptions,
  type SalesLedgerRecord,
  summarizeSalesLedger,
  summarizeSalesLedgerByLocation,
} from "./sales-ledger-support";
import { SalesLedgerTimeline } from "./sales-ledger-timeline";

type Props = {
  classification: "all" | "internal" | "outgoing";
  channel?: ("all" | "ecommerce" | "manual" | "portal" | "pos") | undefined;
  currentPayableOnly?: boolean | undefined;
  dateFrom: string;
  dateTo: string;
  documentType: InvoiceDocumentTypeFilter;
  moneyProfile: MoneyProfile;
  page: number;
  pageSize: number;
  records: SalesLedgerRecord[];
  reportingTotals?: AdminInvoiceReportingTotals | undefined;
  search: string;
  toolbarAction?: ReactNode | undefined;
  totalCount: number;
  status?: ("all" | "confirmed" | "superseded" | "voided") | undefined;
  onChannelChange?:
    | ((value: "all" | "ecommerce" | "manual" | "portal" | "pos") => void)
    | undefined;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClassificationChange: (value: "all" | "internal" | "outgoing") => void;
  onCurrentPayableOnlyChange?: ((value: boolean) => void) | undefined;
  onDocumentTypeChange: (value: InvoiceDocumentTypeFilter) => void;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
  onSearchChange: (value: string) => void;
  onStatusChange?:
    | ((value: "all" | "confirmed" | "superseded" | "voided") => void)
    | undefined;
};

const DEFAULT_DATE_RANGE = createDefaultSalesLedgerDateRange();

export function SalesLedgerWorkspace({
  classification,
  channel,
  currentPayableOnly,
  dateFrom,
  dateTo,
  documentType,
  moneyProfile,
  page,
  pageSize,
  records,
  reportingTotals,
  search,
  toolbarAction,
  totalCount,
  status,
  onChannelChange,
  onDateFromChange,
  onDateToChange,
  onClassificationChange,
  onCurrentPayableOnlyChange,
  onDocumentTypeChange,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onStatusChange,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<
    "all" | "card" | "cash" | "mobile_money" | "transfer"
  >("all");

  const paymentOptions = useMemo(
    () => getSalesLedgerPaymentOptions(records),
    [records],
  );
  const filteredRecords = useMemo(
    () => filterSalesLedgerRecords(records, { paymentMethod, search: "" }),
    [paymentMethod, records],
  );
  const summary = useMemo(
    () => summarizeSalesLedger(filteredRecords),
    [filteredRecords],
  );
  const locationSummary = useMemo(
    () => summarizeSalesLedgerByLocation(filteredRecords),
    [filteredRecords],
  );
  const showLocationPanel = locationSummary.length > 1;

  return (
    <div className="flex flex-col gap-6">
      {toolbarAction ? (
        <div className="flex flex-wrap justify-end gap-3">{toolbarAction}</div>
      ) : null}

      <SalesLedgerFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        documentType={documentType}
        hasFilters={
          paymentMethod !== "all" ||
          search.trim().length > 0 ||
          (channel !== undefined && channel !== "all") ||
          classification !== "all" ||
          currentPayableOnly === true ||
          documentType !== "all" ||
          (status !== undefined && status !== "all") ||
          dateFrom !== DEFAULT_DATE_RANGE.dateFrom ||
          dateTo !== DEFAULT_DATE_RANGE.dateTo
        }
        channel={channel}
        classification={classification}
        currentPayableOnly={currentPayableOnly}
        paymentMethod={paymentMethod}
        paymentOptions={paymentOptions}
        search={search}
        status={status}
        onChannelChange={onChannelChange}
        onClear={() => {
          onDateFromChange(DEFAULT_DATE_RANGE.dateFrom);
          onDateToChange(DEFAULT_DATE_RANGE.dateTo);
          onChannelChange?.("all");
          onClassificationChange("all");
          onDocumentTypeChange("all");
          onCurrentPayableOnlyChange?.(false);
          setPaymentMethod("all");
          onSearchChange("");
          onStatusChange?.("all");
        }}
        onClassificationChange={onClassificationChange}
        onCurrentPayableOnlyChange={onCurrentPayableOnlyChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        onDocumentTypeChange={onDocumentTypeChange}
        onPaymentMethodChange={setPaymentMethod}
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          description={
            reportingTotals
              ? "Latest confirmed payable invoice value."
              : "Sales less issued credit notes."
          }
          icon={TrendingUp}
          label={reportingTotals ? "Current payable" : "Net revenue"}
          value={formatMoney(
            reportingTotals?.currentPayableAmount ?? summary.netRevenueAmount,
            moneyProfile,
          )}
        />
        <StatCard
          description="Original confirmed sales before credits."
          icon={Wallet}
          label="Gross originals"
          value={formatMoney(
            reportingTotals?.grossOriginalSalesAmount ??
              summary.grossSalesAmount,
            moneyProfile,
          )}
        />
        <StatCard
          description="Value returned through credit notes."
          icon={ArrowDownRight}
          label="Credit notes"
          value={formatMoney(
            reportingTotals?.creditedAmount ?? summary.creditNoteAmount,
            moneyProfile,
          )}
        />
        <StatCard
          description="Current valid revenue on adjusted invoices."
          icon={Receipt}
          label="Adjusted sales"
          value={formatMoney(summary.adjustedInvoiceAmount, moneyProfile)}
        />
        <StatCard
          description="Average value per original confirmed receipt."
          icon={Receipt}
          label="Average receipt"
          value={formatMoney(summary.averageReceiptAmount, moneyProfile)}
        />
      </div>

      <SalesLedgerTimeline
        days={summary.timelineDays}
        moneyProfile={moneyProfile}
      />
      {showLocationPanel ? (
        <SalesLedgerLocationPanel
          items={locationSummary}
          moneyProfile={moneyProfile}
        />
      ) : null}
      <SalesLedgerDayTable
        days={summary.timelineDays}
        moneyProfile={moneyProfile}
      />
      {totalCount > pageSize ? (
        <div className="flex justify-end">
          <AppPagination
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            totalCount={totalCount}
          />
        </div>
      ) : null}
    </div>
  );
}
