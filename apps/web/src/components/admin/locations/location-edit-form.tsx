"use client";

import type { AdminUpdateLocationRequest } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import {
  CatalogFormActions,
  CatalogFormCard,
  CatalogFormError,
} from "@/components/admin/catalog/catalog-form-surfaces";
import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
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
    <CatalogFormCard
      description="Changes take effect immediately. The slug stays stable when the name changes."
      title="Edit location"
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <CatalogFormError error={error} title="Unable to save changes" />

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
                  onChange={(event) => field.handleChange(event.target.value)}
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
                  onValueChange={(value) =>
                    field.handleChange(value as "store" | "warehouse")
                  }
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">Store</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                  </SelectContent>
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
                  onValueChange={(value) =>
                    field.handleChange(value as "active" | "inactive")
                  }
                  value={field.state.value}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
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
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isDirty: state.isDirty,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isDirty, isSubmitting }) => (
            <CatalogFormActions
              canSubmit={canSubmit && isDirty}
              isBusy={isSubmitting || isPending}
              onCancel={onCancel}
              submitLabel="Save changes"
              submittingLabel="Saving..."
            />
          )}
        </form.Subscribe>
      </form>
    </CatalogFormCard>
  );
}
