"use client";

import type { StockCountReasonCode } from "@shop/contracts";
import { AppFormField } from "@/components/forms/app-form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STOCK_COUNT_REASON_OPTIONS } from "./stock-count-form.support";

export function SkuInputField({
  errors,
  onBlur,
  onChange,
  showErrors,
  value,
}: {
  errors: ReadonlyArray<unknown>;
  onBlur: () => void;
  onChange: (value: string) => void;
  showErrors: boolean;
  value: string;
}) {
  return (
    <AppFormField
      errors={errors}
      inputId="sku"
      label="SKU"
      description="Enter or scan the SKU. This avoids loading large product lists."
      showErrors={showErrors}
    >
      <Input
        autoComplete="off"
        id="sku"
        maxLength={120}
        name="sku"
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Scan or enter SKU"
        value={value}
      />
    </AppFormField>
  );
}

export function QuantityInputField({
  description,
  errors,
  onBlur,
  onChange,
  showErrors,
  value,
}: {
  description: string;
  errors: ReadonlyArray<unknown>;
  onBlur: () => void;
  onChange: (value: string) => void;
  showErrors: boolean;
  value: string;
}) {
  return (
    <AppFormField
      description={description}
      errors={errors}
      inputId="quantity"
      label="On-hand quantity"
      showErrors={showErrors}
    >
      <Input
        id="quantity"
        min={0}
        name="quantity"
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        required
        type="number"
        value={value}
      />
    </AppFormField>
  );
}

export function ReasonSelectField({
  onChange,
  value,
}: {
  onChange: (value: StockCountReasonCode) => void;
  value: StockCountReasonCode;
}) {
  return (
    <AppFormField inputId="reasonCode" label="Reason">
      <Select
        onValueChange={(next) => onChange(next as StockCountReasonCode)}
        value={value}
      >
        <SelectTrigger id="reasonCode">
          <SelectValue placeholder="Select a reason" />
        </SelectTrigger>
        <SelectContent>
          {STOCK_COUNT_REASON_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </AppFormField>
  );
}

export function NoteTextareaField({
  errors,
  onBlur,
  onChange,
  showErrors,
  value,
}: {
  errors: ReadonlyArray<unknown>;
  onBlur: () => void;
  onChange: (value: string) => void;
  showErrors: boolean;
  value: string;
}) {
  return (
    <AppFormField
      description="Optional evidence for the count or adjustment."
      errors={errors}
      inputId="note"
      label="Note"
      showErrors={showErrors}
    >
      <Textarea
        id="note"
        maxLength={500}
        name="note"
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Example: damaged during unloading, found during shelf count..."
        value={value}
      />
    </AppFormField>
  );
}
