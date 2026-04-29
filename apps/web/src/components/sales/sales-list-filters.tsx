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

export type SalesDocumentTypeFilter =
  | "adjusted"
  | "all"
  | "credit_note"
  | "invoice";

export type SalesClassificationFilter = "all" | "internal" | "outgoing";

type Props = {
  classification: SalesClassificationFilter;
  dateFrom: string;
  dateTo: string;
  documentType: SalesDocumentTypeFilter;
  search: string;
  onClassificationChange: (value: SalesClassificationFilter) => void;
  onClear: () => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onDocumentTypeChange: (value: SalesDocumentTypeFilter) => void;
  onSearchChange: (value: string) => void;
};

export function SalesListFilters({
  classification,
  dateFrom,
  dateTo,
  documentType,
  search,
  onClassificationChange,
  onClear,
  onDateFromChange,
  onDateToChange,
  onDocumentTypeChange,
  onSearchChange,
}: Props) {
  const hasFilters = Boolean(
    dateFrom ||
      dateTo ||
      documentType !== "all" ||
      classification !== "all" ||
      search.trim(),
  );
  const dateRange = toSalesDateRange({ dateFrom, dateTo });

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 xl:grid-cols-3">
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

          <AppFormField inputId="sales-classification" label="Classification">
            <Select
              value={classification}
              onValueChange={(value) =>
                onClassificationChange(value as SalesClassificationFilter)
              }
            >
              <SelectTrigger
                className="h-11 w-full border-border/60 bg-muted/20 transition-all focus:bg-background"
                id="sales-classification"
              >
                <SelectValue placeholder="All classifications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classifications</SelectItem>
                <SelectItem value="outgoing">Outgoing invoices</SelectItem>
                <SelectItem value="internal">Internal invoices</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="adjusted">Adjusted invoices</SelectItem>
                <SelectItem value="credit_note">Credit notes</SelectItem>
              </SelectContent>
            </Select>
          </AppFormField>
        </div>

        <div className="flex flex-col gap-4 border-t border-border/50 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <AppFormField inputId="sales-search" label="Search">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  className="pl-9"
                  id="sales-search"
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Reference or customer"
                  value={search}
                />
              </div>
            </AppFormField>
          </div>

          <Button
            className="h-11 self-start border-border/60 bg-background px-6 text-xs font-bold hover:bg-muted lg:self-auto"
            disabled={!hasFilters}
            onClick={onClear}
            variant="outline"
          >
            <X className="mr-2 size-4" />
            Clear filters
          </Button>
        </div>
      </div>
    </div>
  );
}
