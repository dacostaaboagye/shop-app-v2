import type { AdminOpeningStockRequest } from "@shop/contracts";
import type { FunctionComponent, ReactNode } from "react";
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
import {
  MAX_OPENING_STOCK_ROWS,
  type OpeningStockFormValues,
} from "./opening-stock-setup.support";

type OpeningStockFormField = {
  handleChange: (
    value: OpeningStockFormValues[keyof OpeningStockFormValues],
  ) => void;
  name: keyof OpeningStockFormValues & string;
  state: {
    value: OpeningStockFormValues[keyof OpeningStockFormValues];
  };
};

type OpeningStockForm = {
  Field: (props: {
    children: (field: OpeningStockFormField) => ReactNode;
    name: keyof OpeningStockFormValues;
  }) => ReturnType<FunctionComponent>;
};

export function OpeningStockPasteSection({ form }: { form: OpeningStockForm }) {
  return (
    <details className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Paste many items instead
      </summary>
      <form.Field name="rawRows">
        {(field) => (
          <AppFormField
            description={`One row per SKU, for example RICE-5KG,10. Maximum ${MAX_OPENING_STOCK_ROWS} rows per batch.`}
            inputId={field.name}
            label="Spreadsheet or scanner rows"
            showErrors={false}
          >
            <Textarea
              className="min-h-36 font-mono text-sm"
              id={field.name}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder={"RICE-5KG,10\nSOAP-1L,0\nOIL-1L,24"}
              value={field.state.value}
            />
          </AppFormField>
        )}
      </form.Field>
    </details>
  );
}

export function OpeningStockAuditFields({ form }: { form: OpeningStockForm }) {
  return (
    <details className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Audit details
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <form.Field name="sourceType">
          {(field) => (
            <AppFormField
              inputId={field.name}
              label="Source"
              showErrors={false}
            >
              <Select
                onValueChange={(value) =>
                  field.handleChange(
                    value as AdminOpeningStockRequest["sourceType"],
                  )
                }
                value={field.state.value}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical_count">Physical count</SelectItem>
                  <SelectItem value="import">Spreadsheet import</SelectItem>
                  <SelectItem value="migration">Migration</SelectItem>
                </SelectContent>
              </Select>
            </AppFormField>
          )}
        </form.Field>
        <form.Field name="sourceReference">
          {(field) => (
            <AppFormField
              description="Optional sheet, batch, or migration reference."
              inputId={field.name}
              label="Reference"
              showErrors={false}
            >
              <Input
                id={field.name}
                maxLength={160}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="opening-sheet-1"
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>
        <form.Field name="note">
          {(field) => (
            <AppFormField
              description="Optional evidence for audit context."
              inputId={field.name}
              label="Batch note"
              showErrors={false}
            >
              <Textarea
                id={field.name}
                maxLength={500}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Opening count completed from shelf audit."
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>
      </div>
    </details>
  );
}
