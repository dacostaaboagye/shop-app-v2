"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createAdminLocation } from "@/lib/react-query/admin-location-write";
import { toRoute } from "@/lib/routes";
import {
  DEFAULT_LOCATION_CREATE_VALUES,
  toCreateLocationRequest,
} from "./location-create-page.support";
import {
  LocationFormActions,
  LocationFulfilmentField,
  LocationMapCard,
} from "./location-form-panels";

export function LocationCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const createMutation = useMutation({
    mutationFn: createAdminLocation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
      router.push(toRoute("/admin/locations"));
    },
  });

  const form = useForm({
    defaultValues: DEFAULT_LOCATION_CREATE_VALUES,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);

      await createMutation.mutateAsync(toCreateLocationRequest(value));
    },
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/locations")}
        backLabel="Locations"
        description="Register a new store or warehouse. Settings can be updated after creation."
        title="New location"
      />

      <Card className="border-border/70 bg-card shadow-none">
        <CardHeader>
          <CardTitle>Location details</CardTitle>
          <CardDescription>
            Locations group staff, inventory zones, and fulfilment operations.
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
            {createMutation.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to create location</AlertTitle>
                <AlertDescription>
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : "An unexpected error occurred."}
                </AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup>
              <form.Field
                name="name"
                validators={{
                  onBlur: ({ value }) =>
                    value.trim() ? undefined : "Enter a location name.",
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : "Enter a location name.",
                }}
              >
                {(field) => (
                  <AppFormField
                    description="Used as the display name across the admin and manager portals."
                    errors={field.state.meta.errors}
                    inputId={field.name}
                    label="Name"
                    showErrors={
                      (field.state.meta.isDirty &&
                        field.state.meta.isBlurred) ||
                      wasSubmitted
                    }
                  >
                    <Input
                      id={field.name}
                      maxLength={160}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Accra Central Store"
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>

              <form.Field
                name="type"
                validators={{
                  onBlur: ({ value }) =>
                    value ? undefined : "Select a location type.",
                  onSubmit: ({ value }) =>
                    value ? undefined : "Select a location type.",
                }}
              >
                {(field) => (
                  <AppFormField
                    description="Store for retail-facing operations; warehouse for fulfilment and stock holding."
                    errors={field.state.meta.errors}
                    inputId={field.name}
                    label="Type"
                    showErrors={
                      (field.state.meta.isDirty &&
                        field.state.meta.isBlurred) ||
                      wasSubmitted
                    }
                  >
                    <Select
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(
                          event.target.value as "store" | "warehouse" | "",
                        )
                      }
                      value={field.state.value}
                    >
                      <option value="">Select a type…</option>
                      <option value="store">Store</option>
                      <option value="warehouse">Warehouse</option>
                    </Select>
                  </AppFormField>
                )}
              </form.Field>

              <form.Field name="status">
                {(field) => (
                  <AppFormField
                    description="Inactive locations are hidden from staff portals and fulfilment routing."
                    errors={field.state.meta.errors}
                    inputId={field.name}
                    label="Status"
                    showErrors={wasSubmitted}
                  >
                    <Select
                      id={field.name}
                      onChange={(event) =>
                        field.handleChange(
                          event.target.value as "active" | "inactive",
                        )
                      }
                      value={field.state.value}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </AppFormField>
                )}
              </form.Field>

              <form.Field name="isFulfilmentEnabled">
                {(field) => (
                  <LocationFulfilmentField
                    checked={field.state.value}
                    description="Allows this location to process and ship customer orders. Can be toggled after creation."
                    id={field.name}
                    onChange={field.handleChange}
                  />
                )}
              </form.Field>
            </FieldGroup>

            <form.Subscribe selector={() => form.getFieldValue("latitude")}>
              {() => (
                <LocationMapCard
                  address={form.getFieldValue("address")}
                  description="Click on the map to place a pin, or search for an address. The pin position and address are saved with the location."
                  latitude={form.getFieldValue("latitude")}
                  longitude={form.getFieldValue("longitude")}
                  onChange={(value) => {
                    form.setFieldValue("latitude", value.latitude);
                    form.setFieldValue("longitude", value.longitude);
                    form.setFieldValue("address", value.address);
                  }}
                />
              )}
            </form.Subscribe>

            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <LocationFormActions
                  canSubmit={canSubmit}
                  isBusy={isSubmitting}
                  onCancel={() => router.back()}
                  submitLabel="Create location"
                  submittingLabel="Creating…"
                />
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
