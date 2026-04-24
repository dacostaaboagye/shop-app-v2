"use client";

import type { ReactNode } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LocationCreateFormValues } from "./location-create-page.support";
import {
  LocationFormActions,
  LocationFulfilmentField,
  LocationMapCard,
} from "./location-form-panels";

type LocationFieldValue = boolean | number | string | undefined;

type LocationField = {
  handleBlur: () => void;
  handleChange: (value: LocationFieldValue) => void;
  name: string;
  state: {
    meta: {
      errors: unknown[];
      isBlurred: boolean;
      isDirty: boolean;
    };
    value: LocationFieldValue;
  };
};

type LocationFormState = {
  canSubmit: boolean;
  isSubmitting: boolean;
};

type LocationCreateFormHandle = {
  Field: (props: {
    children: (field: LocationField) => ReactNode;
    name: string;
    validators?: unknown;
  }) => ReactNode;
  Subscribe: (props: {
    children: (value: unknown) => ReactNode;
    selector: (state: LocationFormState) => unknown;
  }) => ReactNode;
  getFieldValue: <K extends keyof LocationCreateFormValues>(
    name: K,
  ) => LocationCreateFormValues[K];
  handleSubmit: () => Promise<void> | void;
  setFieldValue: <K extends keyof LocationCreateFormValues>(
    name: K,
    value: LocationCreateFormValues[K],
  ) => void;
};

type LocationCreateMutationState = {
  error: unknown;
  isError: boolean;
};

type LocationMapValue = Pick<
  LocationCreateFormValues,
  "address" | "latitude" | "longitude"
>;

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
            void locationForm.handleSubmit();
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
                      <SelectItem value="none">Select a type...</SelectItem>
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
                <LocationFormActions
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
      </CardContent>
    </Card>
  );
}
