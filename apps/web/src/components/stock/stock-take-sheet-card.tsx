"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  createStockTakeSheet,
  downloadStockTakeBookletPdf,
  downloadStockTakeSheetCsv,
  type StockTakeMode,
  type StockTakePortal,
  type StockTakeSheetResponse,
} from "@/lib/react-query/stock-takes";
import {
  GeneratedSheetActions,
  saveDownloadedFile,
} from "./stock-take-sheet-card-actions";

export type StockTakeLocationOption = {
  name: string;
  slug: string;
};

type StockTakeSheetCardProps = {
  initialLocationSlug?: string;
  locationControl?: "fixed" | "select";
  locations: StockTakeLocationOption[];
  portal: StockTakePortal;
};

export function StockTakeSheetCard({
  initialLocationSlug = "",
  locationControl = "select",
  locations,
  portal,
}: StockTakeSheetCardProps) {
  const defaultLocationSlug =
    initialLocationSlug || (locations.length === 1 ? locations[0]?.slug : "");
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [createdSheet, setCreatedSheet] =
    useState<StockTakeSheetResponse | null>(null);
  const createMutation = useMutation({
    mutationFn: (value: { locationSlug: string; mode: StockTakeMode }) =>
      createStockTakeSheet(portal, value),
    onSuccess: setCreatedSheet,
  });
  const csvMutation = useMutation({
    mutationFn: (reference: string) =>
      downloadStockTakeSheetCsv(portal, reference),
    onSuccess: saveDownloadedFile,
  });
  const pdfMutation = useMutation({
    mutationFn: (reference: string) =>
      downloadStockTakeBookletPdf(portal, reference),
    onSuccess: saveDownloadedFile,
  });
  const form = useForm({
    defaultValues: {
      locationSlug: defaultLocationSlug ?? "",
      mode: "blind" as StockTakeMode,
    },
    onSubmit: async ({ value }) => {
      setCreatedSheet(null);
      await createMutation.mutateAsync({
        locationSlug: value.locationSlug,
        mode: value.mode,
      });
    },
  });
  const selectedLocation = locations.find(
    (location) => location.slug === defaultLocationSlug,
  );
  const showLocationField = locationControl === "select";

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-4 text-primary" />
          Generate stock-take sheet
        </CardTitle>
        <CardDescription>
          Create a controlled sheet for a physical count. Blind mode hides
          system quantities; assisted mode includes expected stock for review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setWasSubmitted(true);
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            {showLocationField ? (
              <form.Field
                name="locationSlug"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : "Choose a location.",
                }}
              >
                {(field) => (
                  <AppFormField
                    description="Sheets are generated for one operating location at a time."
                    errors={field.state.meta.errors}
                    inputId={field.name}
                    label="Location"
                    showErrors={wasSubmitted}
                  >
                    {locations.length > 1 ? (
                      <Select
                        onValueChange={field.handleChange}
                        value={field.state.value}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="Choose location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem
                              key={location.slug}
                              value={location.slug}
                            >
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium">
                        {selectedLocation?.name ?? "No location selected"}
                      </div>
                    )}
                  </AppFormField>
                )}
              </form.Field>
            ) : null}

            <form.Field name="mode">
              {(field) => (
                <AppFormField
                  inputId={field.name}
                  label="Sheet mode"
                  showErrors={wasSubmitted}
                >
                  <Select
                    onValueChange={(value) =>
                      field.handleChange(value as StockTakeMode)
                    }
                    value={field.state.value}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blind">Blind count</SelectItem>
                      <SelectItem value="assisted">Assisted count</SelectItem>
                    </SelectContent>
                  </Select>
                </AppFormField>
              )}
            </form.Field>
          </FieldGroup>

          {createMutation.error ? (
            <AppErrorBanner
              detail="The sheet could not be generated. Confirm the location access and try again."
              error={createMutation.error}
              title="Unable to generate stock-take sheet"
            />
          ) : null}

          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
              values: state.values,
            })}
          >
            {({ canSubmit, isSubmitting, values }) => (
              <Button
                className="w-full sm:w-fit"
                disabled={
                  !canSubmit ||
                  isSubmitting ||
                  createMutation.isPending ||
                  !values.locationSlug.trim()
                }
                type="submit"
              >
                {isSubmitting || createMutation.isPending ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Generating...
                  </>
                ) : (
                  "Generate sheet"
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
      {createdSheet ? (
        <CardFooter className="flex flex-col items-stretch gap-4">
          <GeneratedSheetActions
            csvError={csvMutation.error}
            isCsvPending={csvMutation.isPending}
            isPdfPending={pdfMutation.isPending}
            onDownloadCsv={() =>
              csvMutation.mutate(createdSheet.stockTakeReference)
            }
            onDownloadPdf={() =>
              pdfMutation.mutate(createdSheet.stockTakeReference)
            }
            pdfError={pdfMutation.error}
            sheet={createdSheet}
          />
        </CardFooter>
      ) : null}
    </Card>
  );
}
