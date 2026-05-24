"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getManualInvoiceStatusLabel,
  MANUAL_INVOICE_STATUS_OPTIONS,
  type ManualInvoiceStatusFilter,
} from "./manual-invoice-request-support";

export function ManualInvoiceRequestFilters({
  onSearchChange,
  onStatusChange,
  search,
  status,
}: {
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ManualInvoiceStatusFilter) => void;
  search: string;
  status: ManualInvoiceStatusFilter;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div className="relative md:max-w-sm md:flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search request or customer"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <Select
        onValueChange={(value) =>
          onStatusChange(value as ManualInvoiceStatusFilter)
        }
        value={status}
      >
        <SelectTrigger className="md:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MANUAL_INVOICE_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {getManualInvoiceStatusLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
