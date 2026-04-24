"use client";

import { formatISO, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePickerSimple } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
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
    <div className="rounded-xl border border-border/50 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-6 sm:grid-cols-3 flex-1">
          <div className="flex flex-col gap-1.5 w-full">
            <Label
              htmlFor="sales-date-from"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
            >
              From
            </Label>
            <DatePickerSimple
              {...(fromDate ? { date: fromDate } : {})}
              id="sales-date-from"
              onSelect={(date) =>
                onDateFromChange(
                  date ? formatISO(date, { representation: "date" }) : "",
                )
              }
              placeholder="From date"
              className="h-11 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <Label
              htmlFor="sales-date-to"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
            >
              To
            </Label>
            <DatePickerSimple
              {...(toDate ? { date: toDate } : {})}
              id="sales-date-to"
              onSelect={(date) =>
                onDateToChange(
                  date ? formatISO(date, { representation: "date" }) : "",
                )
              }
              placeholder="To date"
              className="h-11 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Document type
            </Label>
            <Select
              value={documentType}
              onValueChange={(value) =>
                onDocumentTypeChange(value as SalesDocumentTypeFilter)
              }
            >
              <SelectTrigger
                id="sales-document-type"
                className="h-11 w-full rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all"
              >
                <SelectValue placeholder="All documents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All documents</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="credit_note">Credit notes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            disabled={!hasFilters}
            onClick={onClear}
            variant="outline"
            className="h-11 rounded-xl border-border/60 bg-white hover:bg-muted font-bold text-xs px-6"
          >
            <X className="size-4 mr-2" />
            Clear
          </Button>
          <div className="flex items-center gap-2 rounded-xl bg-muted/20 border border-border/50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shadow-sm">
            <CalendarDays className="size-4 text-primary/60" />
            Filters apply to transaction date.
          </div>
        </div>
      </div>
    </div>
  );
}
