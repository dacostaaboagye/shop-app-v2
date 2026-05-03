"use client";

import type { AdminOpeningStockRequest } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { ClipboardList } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppBanner } from "@/components/system/app-banner";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OpeningStockRowReview } from "./opening-stock-row-review";
import {
  buildOpeningStockRequest,
  getOpeningStockReadyRows,
  getOpeningStockServerRowErrors,
  MAX_OPENING_STOCK_ROWS,
  parseOpeningStockRows,
} from "./opening-stock-setup.support";

type OpeningStockFormValues = {
  note: string;
  rawRows: string;
  sourceReference: string;
  sourceType: AdminOpeningStockRequest["sourceType"];
};

type Props = {
  error: unknown;
  isPending: boolean;
  locationName: string;
  locationSlug: string;
  onSubmit: (request: AdminOpeningStockRequest) => void;
  successMessage?: string | null;
};

export function OpeningStockSetupWorkspace({
  error,
  isPending,
  locationName,
  locationSlug,
  onSubmit,
  successMessage = null,
}: Props) {
  const form = useForm({
    defaultValues: {
      note: "",
      rawRows: "",
      sourceReference: "",
      sourceType: "physical_count",
    } as OpeningStockFormValues,
    onSubmit: async ({ value }) => {
      const rows = parseOpeningStockRows(value.rawRows);
      const readyRows = getOpeningStockReadyRows(rows);
      const blockedCount = rows.length - readyRows.length;
      if (
        rows.length === 0 ||
        rows.length > MAX_OPENING_STOCK_ROWS ||
        blockedCount > 0
      ) {
        return;
      }

      onSubmit(
        buildOpeningStockRequest({
          locationSlug,
          note: value.note,
          rows: readyRows,
          sourceReference: value.sourceReference,
          sourceType: value.sourceType,
        }),
      );
    },
  });

  return (
    <form.Subscribe selector={(state) => state.values}>
      {(values) => {
        const rows = parseOpeningStockRows(values.rawRows);
        const readyRows = getOpeningStockReadyRows(rows);
        const serverErrors = getOpeningStockServerRowErrors(error);
        const blockedCount = rows.length - readyRows.length;
        const overLimit = rows.length > MAX_OPENING_STOCK_ROWS;
        const canSubmit =
          rows.length > 0 && blockedCount === 0 && !overLimit && !isPending;

        return (
          <Card className="overflow-hidden rounded-xl border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="size-5 text-primary" />
                    Opening stock setup
                  </CardTitle>
                  <CardDescription>
                    Initialize SKU baselines for{" "}
                    {locationName || "this location"} by pasting scanner output
                    or spreadsheet rows in SKU, quantity format.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{readyRows.length} ready</Badge>
                  <Badge variant={blockedCount > 0 ? "destructive" : "outline"}>
                    {blockedCount} blocked
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(280px,420px)_1fr]">
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void form.handleSubmit();
                }}
              >
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
                          <SelectItem value="physical_count">
                            Physical count
                          </SelectItem>
                          <SelectItem value="import">
                            Spreadsheet import
                          </SelectItem>
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
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="opening-sheet-1"
                        value={field.state.value}
                      />
                    </AppFormField>
                  )}
                </form.Field>

                <form.Field name="rawRows">
                  {(field) => (
                    <AppFormField
                      description={`Use one SKU per line. Comma, tab, and whitespace separated rows are supported. Maximum ${MAX_OPENING_STOCK_ROWS} rows per batch.`}
                      inputId={field.name}
                      label="SKU rows"
                      showErrors={false}
                    >
                      <Textarea
                        className="min-h-44 font-mono text-sm"
                        id={field.name}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder={"RICE-5KG,10\nSOAP-1L,0\nOIL-1L,24"}
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
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Opening count completed from shelf audit."
                        value={field.state.value}
                      />
                    </AppFormField>
                  )}
                </form.Field>

                {successMessage ? (
                  <AppBanner
                    description={successMessage}
                    title="Opening stock saved"
                    tone="success"
                  />
                ) : null}

                {overLimit ? (
                  <AppBanner
                    description={`This batch has ${rows.length} rows. Split it into batches of ${MAX_OPENING_STOCK_ROWS} rows or fewer before submitting.`}
                    title="Batch is too large"
                    tone="warning"
                  />
                ) : null}

                {error ? (
                  <AppErrorBanner
                    error={error}
                    title="Opening stock not saved"
                  />
                ) : null}

                <Button disabled={!canSubmit} type="submit">
                  {isPending
                    ? "Saving opening stock..."
                    : "Initialize opening stock"}
                </Button>
              </form>

              <OpeningStockRowReview rows={rows} serverErrors={serverErrors} />
            </CardContent>
          </Card>
        );
      }}
    </form.Subscribe>
  );
}
