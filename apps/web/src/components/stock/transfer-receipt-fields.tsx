"use client";

import type { ReceiptDiscrepancyReason } from "@shop/contracts";
import { AppFormField } from "@/components/forms/app-form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TransferReceiptFormValues } from "./transfer-receipt.support";
import {
  formatReceiptDiscrepancyReason,
  getReceiptFormError,
  hasReceiptFormDiscrepancy,
  receiptDiscrepancyReasonOptions,
} from "./transfer-receipt.support";

export function TransferReceiptFields({
  disabled,
  expectedQuantity,
  includeNotes = true,
  onChange,
  values,
}: {
  disabled?: boolean;
  expectedQuantity: number;
  includeNotes?: boolean;
  onChange: (values: TransferReceiptFormValues) => void;
  values: TransferReceiptFormValues;
}) {
  const receiptError = getReceiptFormError(values, expectedQuantity);
  const hasDiscrepancy = hasReceiptFormDiscrepancy(values, expectedQuantity);
  const receivedQuantity = Number(values.receivedQuantity || expectedQuantity);
  const missingQuantity = Math.max(0, expectedQuantity - receivedQuantity);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <span className="type-kicker text-muted-foreground">Dispatched</span>
          <span className="type-data-value text-2xl">{expectedQuantity}</span>
        </div>
        <AppFormField
          inputId="received-quantity"
          label="Accepted quantity"
          errors={receiptError ? [receiptError] : []}
        >
          <Input
            id="received-quantity"
            inputMode="numeric"
            min={0}
            max={expectedQuantity}
            onChange={(event) =>
              onChange({ ...values, receivedQuantity: event.target.value })
            }
            type="number"
            value={values.receivedQuantity}
            disabled={disabled}
          />
        </AppFormField>
      </div>

      {hasDiscrepancy ? (
        <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/10 p-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <span className="type-kicker text-muted-foreground">Missing</span>
            <span className="type-data-value text-2xl">{missingQuantity}</span>
          </div>
          <AppFormField
            inputId="receipt-discrepancy-reason"
            label="Discrepancy reason"
          >
            <Select
              value={values.discrepancyReason}
              onValueChange={(value) =>
                onChange({
                  ...values,
                  discrepancyReason: value as ReceiptDiscrepancyReason,
                })
              }
              disabled={disabled}
            >
              <SelectTrigger id="receipt-discrepancy-reason">
                {formatReceiptDiscrepancyReason(values.discrepancyReason)}
              </SelectTrigger>
              <SelectContent>
                {receiptDiscrepancyReasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AppFormField>
          <AppFormField
            inputId="receipt-discrepancy-notes"
            label="Discrepancy notes"
            description="Optional detail for audit and follow-up."
          >
            <Textarea
              id="receipt-discrepancy-notes"
              maxLength={500}
              onChange={(event) =>
                onChange({ ...values, discrepancyNotes: event.target.value })
              }
              rows={3}
              value={values.discrepancyNotes}
              disabled={disabled}
            />
          </AppFormField>
        </div>
      ) : null}

      {includeNotes ? (
        <AppFormField inputId="receipt-notes" label="Receipt notes">
          <Textarea
            id="receipt-notes"
            maxLength={500}
            onChange={(event) =>
              onChange({ ...values, notes: event.target.value })
            }
            placeholder="Optional operational notes about the received goods."
            rows={3}
            value={values.notes}
            disabled={disabled}
          />
        </AppFormField>
      ) : null}
    </div>
  );
}
