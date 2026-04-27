"use client";

import { CalendarDays, X } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
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

export type SalesDocumentTypeFilter = "all" | "credit_note" | "invoice";

type Props = {
  dateFrom: string;
  dateTo: string;
  documentType: SalesDocumentTypeFilter;
  onClear: () => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onDocumentTypeChange: (value: SalesDocumentTypeFilter) => void;
};

export function SalesListFilters({
  dateFrom,
  dateTo,
  documentType,
  onClear,
  onDateFromChange,
  onDateToChange,
  onDocumentTypeChange,
}: Props) {
  const hasFilters = Boolean(dateFrom || dateTo || documentType !== "all");
  const dateRange = toSalesDateRange({ dateFrom, dateTo });

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="grid min-w-0 gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <AppFormField inputId="sales-date-range" label="Date Range">
              <DatePickerWithRange
                {...(dateRange ? { date: dateRange } : {})}
                className="w-full"
                id="sales-date-range"
                onSelect={(value) => {
                  const nextRange = fromSalesDateRange(value);
                  onDateFromChange(nextRange.dateFrom);
                  onDateToChange(nextRange.dateTo);
                }}
                placeholder="Pick a date range"
              />
            </AppFormField>
            <AppFormField inputId="sales-document-type" label="Document Type">
              <Select
                value={documentType}
                onValueChange={(value) =>
                  onDocumentTypeChange(value as SalesDocumentTypeFilter)
                }
              >
                <SelectTrigger
                  className="h-11 w-full border-border/60 bg-muted/20 transition-all focus:bg-background"
                  id="sales-document-type"
                >
                  <SelectValue placeholder="All documents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All documents</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="credit_note">Credit notes</SelectItem>
                </SelectContent>
              </Select>
            </AppFormField>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-4 lg:justify-end">
            <Button
              disabled={!hasFilters}
              className="h-11 border-border/60 bg-background px-6 text-xs font-bold hover:bg-muted"
              onClick={onClear}
              variant="outline"
            >
              <X className="mr-2 size-4" />
              Clear
            </Button>
            <div className="type-support flex min-w-0 items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 shadow-sm">
              <CalendarDays className="size-4 shrink-0 text-primary/60" />
              <span className="min-w-0 text-pretty">
                Filters apply to transaction date.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
