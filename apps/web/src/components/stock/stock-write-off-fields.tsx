import type {
  AdminStockBalanceSummary,
  StockWriteOffReasonCode,
} from "@shop/contracts";
import { AppFormField } from "@/components/forms/app-form-field";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STOCK_WRITE_OFF_REASON_OPTIONS } from "./stock-write-off-form.support";

export function WriteOffStockSummary({
  row,
}: {
  row: AdminStockBalanceSummary;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-3">
      <StockMetric label="On hand" value={row.onHandQuantity} />
      <StockMetric label="Reserved" value={row.reservedQuantity} />
      <StockMetric label="Available" value={row.availableQuantity} />
    </div>
  );
}

function StockMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="type-data-label text-muted-foreground">{label}</p>
      <Badge className="mt-1 tabular-nums" variant="outline">
        {value}
      </Badge>
    </div>
  );
}

export function WriteOffQuantityField(props: {
  availableQuantity: number;
  errors: ReadonlyArray<unknown>;
  onBlur: () => void;
  onChange: (value: string) => void;
  showErrors: boolean;
  value: string;
}) {
  return (
    <AppFormField
      description="This quantity will be removed from on-hand stock."
      errors={props.errors}
      inputId="write-off-quantity"
      label="Quantity"
      showErrors={props.showErrors}
    >
      <Input
        id="write-off-quantity"
        max={props.availableQuantity}
        min={1}
        name="quantity"
        onBlur={props.onBlur}
        onChange={(event) => props.onChange(event.target.value)}
        required
        type="number"
        value={props.value}
      />
    </AppFormField>
  );
}

export function WriteOffReasonField({
  onChange,
  value,
}: {
  onChange: (value: StockWriteOffReasonCode) => void;
  value: StockWriteOffReasonCode;
}) {
  const selectedLabel =
    STOCK_WRITE_OFF_REASON_OPTIONS.find((option) => option.value === value)
      ?.label ?? "Select a reason";

  return (
    <AppFormField inputId="write-off-reason" label="Reason">
      <Select
        onValueChange={(next) => onChange(next as StockWriteOffReasonCode)}
        value={value}
      >
        <SelectTrigger id="write-off-reason">
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STOCK_WRITE_OFF_REASON_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </AppFormField>
  );
}

export function WriteOffNoteField(props: {
  errors: ReadonlyArray<unknown>;
  onBlur: () => void;
  onChange: (value: string) => void;
  showErrors: boolean;
  value: string;
}) {
  return (
    <AppFormField
      description="Required evidence for the stock movement history."
      errors={props.errors}
      inputId="write-off-note"
      label="Evidence note"
      showErrors={props.showErrors}
    >
      <Textarea
        id="write-off-note"
        maxLength={500}
        name="note"
        onBlur={props.onBlur}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="Example: expired on shelf, damaged during unloading..."
        required
        value={props.value}
      />
    </AppFormField>
  );
}
