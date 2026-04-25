"use client";

import { formatISO, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Button } from "@/components/ui/button";
import { DatePickerSimple } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const fromDate = dateFrom ? parseISO(dateFrom) : undefined;
  const toDate = dateTo ? parseISO(dateTo) : undefined;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="grid min-w-0 gap-6 sm:grid-cols-3">
            <AppFormField inputId="sales-date-from" label="From">
              <DatePickerSimple
                {...(fromDate ? { date: fromDate } : {})}
                className="h-11 border-border/60 bg-muted/20 transition-all focus:bg-background"
                id="sales-date-from"
                onSelect={(date) =>
                  onDateFromChange(
                    date ? formatISO(date, { representation: "date" }) : "",
                  )
                }
                placeholder="From date"
              />
            </AppFormField>
            <AppFormField inputId="sales-date-to" label="To">
              <DatePickerSimple
                {...(toDate ? { date: toDate } : {})}
                className="h-11 border-border/60 bg-muted/20 transition-all focus:bg-background"
                id="sales-date-to"
                onSelect={(date) =>
                  onDateToChange(
                    date ? formatISO(date, { representation: "date" }) : "",
                  )
                }
                placeholder="To date"
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
