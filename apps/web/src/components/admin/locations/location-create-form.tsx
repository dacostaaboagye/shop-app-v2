"use client";

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
import type {
  LocationCreateFormHandle,
  LocationCreateMutationState,
  LocationFormState,
  LocationMapValue,
} from "./location-create-form.types";
import {
  LocationFulfilmentField,
  LocationMapCard,
} from "./location-form-panels";

export function LocationCreateForm({
  form,
  mutation,
  onCancel,
  setWasSubmitted,
  wasSubmitted,
}: {
  form: unknown;
  mutation: unknown;
  onCancel: () => void;
  setWasSubmitted: (value: boolean) => void;
  wasSubmitted: boolean;
}) {
  const locationForm = form as LocationCreateFormHandle;
  const createMutation = mutation as LocationCreateMutationState;

  return (
    <CatalogFormCard
      description="Locations group staff, storage zones, fulfilment routing, and mapped site details."
      title="Location details"
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setWasSubmitted(true);
          void locationForm.handleSubmit();
        }}
      >
        <CatalogFormError
          error={createMutation.isError ? createMutation.error : null}
          title="Unable to create location"
        />

        <FieldGroup>
          <locationForm.Field
            name="name"
            validators={{
              onBlur: ({ value }: { value: string }) =>
                value.trim() ? undefined : "Enter a location name.",
              onSubmit: ({ value }: { value: string }) =>
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
                  (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                  wasSubmitted
                }
              >
                <Input
                  id={field.name}
                  maxLength={160}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Accra Central Store"
                  value={String(field.state.value ?? "")}
                />
              </AppFormField>
            )}
          </locationForm.Field>

          <locationForm.Field
            name="type"
            validators={{
              onBlur: ({ value }: { value: string }) =>
                value ? undefined : "Select a location type.",
              onSubmit: ({ value }: { value: string }) =>
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
                  (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                  wasSubmitted
                }
              >
                <Select
                  onValueChange={(value) =>
                    field.handleChange(value as "store" | "warehouse" | "")
                  }
                  value={String(field.state.value ?? "")}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select a type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">Store</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </AppFormField>
            )}
          </locationForm.Field>

          <locationForm.Field name="status">
            {(field) => (
              <AppFormField
                description="Inactive locations are hidden from staff portals and fulfilment routing."
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Status"
                showErrors={wasSubmitted}
              >
                <Select
                  onValueChange={(value) =>
                    field.handleChange(value as "active" | "inactive")
                  }
                  value={String(field.state.value ?? "")}
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
          </locationForm.Field>

          <locationForm.Field name="isFulfilmentEnabled">
            {(field) => (
              <LocationFulfilmentField
                checked={Boolean(field.state.value)}
                description="Allows this location to process and ship customer orders. Can be toggled after creation."
                id={field.name}
                onChange={field.handleChange}
              />
            )}
          </locationForm.Field>
        </FieldGroup>

        <locationForm.Subscribe
          selector={() => locationForm.getFieldValue("latitude")}
        >
          {() => (
            <LocationMapCard
              address={locationForm.getFieldValue("address")}
              description="Click on the map to place a pin, or search for an address. The pin position and address are saved with the location."
              latitude={locationForm.getFieldValue("latitude")}
              longitude={locationForm.getFieldValue("longitude")}
              onChange={(value: LocationMapValue) => {
                locationForm.setFieldValue("latitude", value.latitude);
                locationForm.setFieldValue("longitude", value.longitude);
                locationForm.setFieldValue("address", value.address);
              }}
            />
          )}
        </locationForm.Subscribe>

        <locationForm.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {(state) => {
            const submitState = state as LocationFormState;
            return (
              <CatalogFormActions
                canSubmit={submitState.canSubmit}
                isBusy={submitState.isSubmitting}
                onCancel={onCancel}
                submitLabel="Create location"
                submittingLabel="Creating..."
              />
            );
          }}
        </locationForm.Subscribe>
      </form>
    </CatalogFormCard>
  );
}
