"use client";

import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sales-date-from">From</Label>
            <Input
              id="sales-date-from"
              onChange={(event) => onDateFromChange(event.target.value)}
              type="date"
              value={dateFrom}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sales-date-to">To</Label>
            <Input
              id="sales-date-to"
              onChange={(event) => onDateToChange(event.target.value)}
              type="date"
              value={dateTo}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sales-document-type">Document type</Label>
            <Select
              id="sales-document-type"
              onChange={(event) =>
                onDocumentTypeChange(
                  event.target.value as SalesDocumentTypeFilter,
                )
              }
              value={documentType}
            >
              <option value="all">All documents</option>
              <option value="invoice">Invoices</option>
              <option value="credit_note">Credit notes</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!hasFilters} onClick={onClear} variant="outline">
            <X data-icon="inline-start" />
            Clear
          </Button>
          <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <CalendarDays className="size-4" />
            Filters apply to transaction date.
          </div>
        </div>
      </div>
    </div>
  );
}
