"use client";

import type { AdminUpdateLocationRequest } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { AppFormField } from "@/components/forms/app-form-field";
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
import {
  LocationFormActions,
  LocationFulfilmentField,
  LocationMapCard,
} from "./location-form-panels";

export function LocationEditForm({
  error,
  isPending,
  location,
  onCancel,
  onSubmit,
}: {
  error: unknown;
  isPending: boolean;
  location: {
    address?: string | null | undefined;
    isFulfilmentEnabled: boolean;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    name: string;
    status: "active" | "inactive";
    type: "store" | "warehouse";
  };
  onCancel: () => void;
  onSubmit: (values: AdminUpdateLocationRequest) => void;
}) {
  const form = useForm({
    defaultValues: {
      address: location.address ?? "",
      isFulfilmentEnabled: location.isFulfilmentEnabled,
      latitude: location.latitude ?? (undefined as number | undefined),
      longitude: location.longitude ?? (undefined as number | undefined),
      name: location.name,
      status: location.status,
      type: location.type,
    },
    onSubmit: async ({ value }) => {
      onSubmit({
        ...(value.address ? { address: value.address } : { address: null }),
        isFulfilmentEnabled: value.isFulfilmentEnabled,
        ...(value.latitude != null
          ? { latitude: value.latitude }
          : { latitude: null }),
        ...(value.longitude != null
          ? { longitude: value.longitude }
          : { longitude: null }),
        name: value.name.trim(),
        status: value.status,
        type: value.type,
      });
    },
  });

  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle>Edit location</CardTitle>
        <CardDescription>
          Changes take effect immediately. The slug is not updated when the name
          changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save changes</AlertTitle>
              <AlertDescription>
                {error instanceof Error
                  ? error.message
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
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Name"
                  showErrors={field.state.meta.isBlurred}
                >
                  <Input
                    disabled={isPending}
                    id={field.name}
                    maxLength={160}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>

            <form.Field name="type">
              {(field) => (
                <AppFormField
                  description="Store for retail operations; warehouse for stock holding and fulfilment."
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Type"
                >
                  <Select
                    disabled={isPending}
                    id={field.name}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value as "store" | "warehouse",
                      )
                    }
                    value={field.state.value}
                  >
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
                >
                  <Select
                    disabled={isPending}
                    id={field.name}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value as "active" | "inactive",
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
                  description="Allows this location to process and ship customer orders."
                  disabled={isPending}
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
                description="Click on the map to update the pin, or search for a new address."
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
            selector={(s) => ({
              canSubmit: s.canSubmit,
              isDirty: s.isDirty,
              isSubmitting: s.isSubmitting,
            })}
          >
            {({ canSubmit, isDirty, isSubmitting }) => (
              <LocationFormActions
                canSubmit={canSubmit && isDirty}
                isBusy={isSubmitting || isPending}
                onCancel={onCancel}
                submitLabel="Save changes"
                submittingLabel="Saving…"
              />
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  );
}
