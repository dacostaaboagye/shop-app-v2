"use client";

import { AppFormField } from "@/components/forms/app-form-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type SalesLedgerChannelFilter =
  | "all"
  | "ecommerce"
  | "manual"
  | "portal"
  | "pos";
export type SalesLedgerStatusFilter =
  | "all"
  | "confirmed"
  | "superseded"
  | "voided";

type Props = {
  channel?: SalesLedgerChannelFilter | undefined;
  currentPayableOnly?: boolean | undefined;
  status?: SalesLedgerStatusFilter | undefined;
  onChannelChange?: ((value: SalesLedgerChannelFilter) => void) | undefined;
  onCurrentPayableOnlyChange?: ((value: boolean) => void) | undefined;
  onStatusChange?: ((value: SalesLedgerStatusFilter) => void) | undefined;
};

export function SalesLedgerAdminFilters({
  channel,
  currentPayableOnly,
  status,
  onChannelChange,
  onCurrentPayableOnlyChange,
  onStatusChange,
}: Props) {
  if (!onChannelChange && !onStatusChange && !onCurrentPayableOnlyChange) {
    return null;
  }

  return (
    <div className="grid min-w-0 gap-6 border-t border-border/50 pt-6 lg:grid-cols-3">
      {onChannelChange ? (
        <AppFormField inputId="sales-ledger-channel" label="Channel">
          <Select
            value={channel ?? "all"}
            onValueChange={(value) =>
              onChannelChange(value as SalesLedgerChannelFilter)
            }
          >
            <SelectTrigger id="sales-ledger-channel">
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
              <SelectItem value="portal">Customer portal</SelectItem>
              <SelectItem value="ecommerce">Ecommerce</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </AppFormField>
      ) : null}

      {onStatusChange ? (
        <AppFormField inputId="sales-ledger-status" label="Status">
          <Select
            value={status ?? "all"}
            onValueChange={(value) =>
              onStatusChange(value as SalesLedgerStatusFilter)
            }
          >
            <SelectTrigger id="sales-ledger-status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="superseded">Superseded</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
        </AppFormField>
      ) : null}

      {onCurrentPayableOnlyChange ? (
        <div className="flex min-w-0 items-end">
          <div className="flex min-h-11 w-full items-center justify-between gap-4 rounded-xl border border-border/60 bg-background px-4 py-3">
            <Label
              className="type-data-label cursor-pointer"
              htmlFor="sales-ledger-current-payable"
            >
              Current payable only
            </Label>
            <Switch
              checked={currentPayableOnly ?? false}
              id="sales-ledger-current-payable"
              onCheckedChange={onCurrentPayableOnlyChange}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
