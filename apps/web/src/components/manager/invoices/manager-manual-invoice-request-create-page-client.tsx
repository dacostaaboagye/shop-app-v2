"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActiveLocationScope } from "@/lib/authorization/use-active-location-scope";
import {
  createManagerManualInvoiceRequest,
  manualInvoiceRequestsQueryKey,
} from "@/lib/react-query/manual-invoices";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { ManagerManualInvoiceCustomerFields } from "./manager-manual-invoice-customer-fields";
import { ManagerManualInvoiceRequestLinePicker } from "./manager-manual-invoice-request-line-picker";
import {
  getCustomerSelectionError,
  getDraftLinesError,
  isValidDraftLine,
  MANUAL_INVOICE_REQUEST_DEFAULT_VALUES,
  type ManualInvoiceDraftLine,
  normalizeAddressLines,
} from "./manual-invoice-request-create.support";

export function ManagerManualInvoiceRequestCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [lines, setLines] = useState<ManualInvoiceDraftLine[]>([]);
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = useActiveLocationScope("invoices.manual.request");
  const createMutation = useMutation({
    mutationFn: createManagerManualInvoiceRequest,
    onSuccess(data) {
      toast.success(`Manual invoice request ${data.reference} submitted.`);
      void queryClient.invalidateQueries({
        queryKey: manualInvoiceRequestsQueryKey("manager", {
          page: 1,
          pageSize: 25,
          status: "all",
        }),
      });
      router.push(
        toRoute(
          `/manager/invoices/manual-requests/${encodeURIComponent(
            data.reference,
          )}`,
        ),
      );
    },
  });
  const form = useForm({
    defaultValues: MANUAL_INVOICE_REQUEST_DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      if (!selectedLocationScope || lines.length === 0) return;
      if (lines.some((line) => !isValidDraftLine(line))) return;
      if (getCustomerSelectionError(value, true)) return;
      await createMutation.mutateAsync({
        ...(normalizeAddressLines(value.address)
          ? {
              customerBillingAddressLines: normalizeAddressLines(value.address),
            }
          : {}),
        ...(value.customerEmail.trim()
          ? { customerEmail: value.customerEmail.trim() }
          : {}),
        ...(value.customerContactReference
          ? { customerContactReference: value.customerContactReference }
          : {}),
        ...(value.customerName.trim()
          ? { customerName: value.customerName.trim() }
          : {}),
        ...(value.customerPhone.trim()
          ? { customerPhone: value.customerPhone.trim() }
          : {}),
        ...(value.customerSlug ? { customerSlug: value.customerSlug } : {}),
        ...(value.customerTaxNumber.trim()
          ? { customerTaxNumber: value.customerTaxNumber.trim() }
          : {}),
        lines: lines.map((line) => ({
          quantity: Number.parseInt(line.quantity, 10),
          skuId: line.skuId,
          unitPrice: line.unitPrice.trim(),
        })),
        locationId: selectedLocationScope.locationId,
        ...(value.paymentMethod !== "none"
          ? {
              paymentMethod: value.paymentMethod as
                | "card"
                | "cash"
                | "mobile_money"
                | "transfer",
            }
          : {}),
        reason: value.reason.trim(),
        ...(value.supportingNote.trim()
          ? { supportingNote: value.supportingNote.trim() }
          : {}),
      });
    },
  });
  const lineError = getDraftLinesError(lines, wasSubmitted);
  const customerError = getCustomerSelectionError(
    form.state.values,
    wasSubmitted,
  );

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/manager/invoices/manual-requests")}
        backLabel="Manual requests"
        description="Submit an exceptional invoice request for finance approval."
        title="New manual invoice request"
      />

      <LocationScopePanel
        description="Choose the managed location this request belongs to."
        emptyDescription="No managed location is available for manual invoice requests."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Request location"
      />

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
        {createMutation.isError ? (
          <AppErrorBanner
            detail="Manual invoice request could not be submitted."
            error={createMutation.error}
            title="Unable to submit request"
          />
        ) : null}

        <FieldGroup className="rounded-lg border bg-card p-4">
          <form.Field name="customerName">
            {(field) => (
              <AppFormField
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Customer name"
                showErrors={wasSubmitted}
              >
                <Input
                  id={field.name}
                  maxLength={160}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </AppFormField>
            )}
          </form.Field>
          <ManagerManualInvoiceCustomerFields
            form={form}
            wasSubmitted={wasSubmitted}
          />
          {customerError ? (
            <p className="text-sm text-destructive">{customerError}</p>
          ) : null}
        </FieldGroup>

        {selectedLocationScope ? (
          <ManagerManualInvoiceRequestLinePicker
            lines={lines}
            locationId={selectedLocationScope.locationId}
            onChange={setLines}
          />
        ) : null}
        {lineError ? (
          <p className="text-sm text-destructive">{lineError}</p>
        ) : null}

        <FieldGroup className="rounded-lg border bg-card p-4">
          <form.Field
            name="reason"
            validators={{
              onSubmit: ({ value }) =>
                value.trim() ? undefined : "Enter the request reason.",
            }}
          >
            {(field) => (
              <AppFormField
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Reason"
                showErrors={wasSubmitted}
              >
                <Textarea
                  id={field.name}
                  maxLength={500}
                  rows={4}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </AppFormField>
            )}
          </form.Field>
          <form.Field name="supportingNote">
            {(field) => (
              <AppFormField
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Supporting note"
                showErrors={wasSubmitted}
              >
                <Textarea
                  id={field.name}
                  maxLength={1000}
                  rows={3}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </AppFormField>
            )}
          </form.Field>
        </FieldGroup>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={() =>
              router.push(toRoute("/manager/invoices/manual-requests"))
            }
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={createMutation.isPending} type="submit">
            {createMutation.isPending ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
