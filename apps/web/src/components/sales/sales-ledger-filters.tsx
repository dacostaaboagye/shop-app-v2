"use client";

import { Search, X } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fromSalesDateRange,
  toSalesDateRange,
} from "./sales-list-filters.support";

type Props = {
  dateFrom: string;
  dateTo: string;
  documentType: "all" | "credit_note" | "invoice";
  hasFilters: boolean;
  paymentMethod: "all" | "card" | "cash" | "mobile_money" | "transfer";
  paymentOptions: readonly ("card" | "cash" | "mobile_money" | "transfer")[];
  search: string;
  onClear: () => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onDocumentTypeChange: (value: "all" | "credit_note" | "invoice") => void;
  onPaymentMethodChange: (
    value: "all" | "card" | "cash" | "mobile_money" | "transfer",
  ) => void;
  onSearchChange: (value: string) => void;
};

const PAYMENT_LABELS = {
  card: "Card",
  cash: "Cash",
  mobile_money: "Mobile money",
  transfer: "Transfer",
} as const;

export function SalesLedgerFilters({
  dateFrom,
  dateTo,
  documentType,
  hasFilters,
  paymentMethod,
  paymentOptions,
  search,
  onClear,
  onDateFromChange,
  onDateToChange,
  onDocumentTypeChange,
  onPaymentMethodChange,
  onSearchChange,
}: Props) {
  const dateRange = toSalesDateRange({ dateFrom, dateTo });

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid min-w-0 gap-6 2xl:grid-cols-2">
          <AppFormField inputId="sales-ledger-date-range" label="Date Range">
            <DatePickerWithRange
              {...(dateRange ? { date: dateRange } : {})}
              className="w-full"
              id="sales-ledger-date-range"
              onSelect={(value) => {
                const nextRange = fromSalesDateRange(value);
                onDateFromChange(nextRange.dateFrom);
                onDateToChange(nextRange.dateTo);
              }}
              placeholder="Pick a date range"
            />
          </AppFormField>
          <AppFormField inputId="sales-ledger-search" label="Search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                className="pl-9"
                id="sales-ledger-search"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Reference, customer, worker, or shop"
                value={search}
              />
            </div>
          </AppFormField>
        </div>

        <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto] 2xl:items-end">
          <AppFormField
            inputId="sales-ledger-document-type"
            label="Document Type"
          >
            <Select
              value={documentType}
              onValueChange={(value) =>
                onDocumentTypeChange(value as "all" | "credit_note" | "invoice")
              }
            >
              <SelectTrigger id="sales-ledger-document-type">
                <SelectValue placeholder="All documents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All documents</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="credit_note">Credit notes</SelectItem>
              </SelectContent>
            </Select>
          </AppFormField>

          <AppFormField
            inputId="sales-ledger-payment-method"
            label="Payment Method"
          >
            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                onPaymentMethodChange(
                  value as
                    | "all"
                    | "card"
                    | "cash"
                    | "mobile_money"
                    | "transfer",
                )
              }
            >
              <SelectTrigger id="sales-ledger-payment-method">
                <SelectValue placeholder="All methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {paymentOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {PAYMENT_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AppFormField>

          <Button
            className="h-11 w-full px-6 2xl:w-auto 2xl:col-span-1"
            disabled={!hasFilters}
            onClick={onClear}
            variant="outline"
          >
            <X className="mr-2 size-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
