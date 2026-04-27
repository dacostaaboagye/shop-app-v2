"use client";

import type { InvoiceDocumentTypeFilter } from "@shop/contracts";
import { ArrowDownRight, Receipt, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
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
  dateFrom: string;
  dateTo: string;
  documentType: InvoiceDocumentTypeFilter;
  moneyProfile: MoneyProfile;
  records: SalesLedgerRecord[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onDocumentTypeChange: (value: InvoiceDocumentTypeFilter) => void;
};

const DEFAULT_DATE_RANGE = createDefaultSalesLedgerDateRange();

export function SalesLedgerWorkspace({
  dateFrom,
  dateTo,
  documentType,
  moneyProfile,
  records,
  onDateFromChange,
  onDateToChange,
  onDocumentTypeChange,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<
    "all" | "card" | "cash" | "mobile_money" | "transfer"
  >("all");
  const [search, setSearch] = useState("");

  const paymentOptions = useMemo(
    () => getSalesLedgerPaymentOptions(records),
    [records],
  );
  const filteredRecords = useMemo(
    () => filterSalesLedgerRecords(records, { paymentMethod, search }),
    [paymentMethod, records, search],
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
      <SalesLedgerFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        documentType={documentType}
        hasFilters={
          paymentMethod !== "all" ||
          search.trim().length > 0 ||
          documentType !== "all" ||
          dateFrom !== DEFAULT_DATE_RANGE.dateFrom ||
          dateTo !== DEFAULT_DATE_RANGE.dateTo
        }
        paymentMethod={paymentMethod}
        paymentOptions={paymentOptions}
        search={search}
        onClear={() => {
          onDateFromChange(DEFAULT_DATE_RANGE.dateFrom);
          onDateToChange(DEFAULT_DATE_RANGE.dateTo);
          onDocumentTypeChange("all");
          setPaymentMethod("all");
          setSearch("");
        }}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        onDocumentTypeChange={onDocumentTypeChange}
        onPaymentMethodChange={setPaymentMethod}
        onSearchChange={setSearch}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          description="Sales less issued credit notes."
          icon={TrendingUp}
          label="Net revenue"
          value={formatMoney(summary.netRevenueAmount, moneyProfile)}
        />
        <StatCard
          description="Confirmed sales captured in the ledger."
          icon={Wallet}
          label="Gross sales"
          value={formatMoney(summary.grossSalesAmount, moneyProfile)}
        />
        <StatCard
          description="Value returned through credit notes."
          icon={ArrowDownRight}
          label="Credit notes"
          value={formatMoney(summary.creditNoteAmount, moneyProfile)}
        />
        <StatCard
          description="Average value per confirmed receipt."
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
    </div>
  );
}
