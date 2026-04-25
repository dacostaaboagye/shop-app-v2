"use client";

import type { AdminLocationZoneSummary } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { CatalogFormError } from "@/components/admin/catalog/catalog-form-surfaces";
import { AppFormField } from "@/components/forms/app-form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminLocationZone,
  updateAdminLocationZone,
} from "@/lib/react-query/admin-location-zones";

type LocationZoneFormProps = {
  locationSlug: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  zone?: AdminLocationZoneSummary | null;
};

export function LocationZoneForm({
  locationSlug,
  onOpenChange,
  onSuccess,
  open,
  zone,
}: LocationZoneFormProps) {
  const isEditing = !!zone;
  const dialogTitle = isEditing ? "Edit zone" : "Add zone";
  const dialogDescription = isEditing
    ? "Update the name and handling notes for this storage zone."
    : "Create a new storage zone within this location.";

  const mutation = useMutation({
    mutationFn: (values: { description?: string | null; name: string }) =>
      isEditing
        ? updateAdminLocationZone(locationSlug, zone.slug, values)
        : createAdminLocationZone(locationSlug, values),
    onSuccess: () => {
      onSuccess();
    },
  });

  const form = useForm({
    defaultValues: {
      description: zone?.description ?? "",
      name: zone?.name ?? "",
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        ...value,
        description: value.description || null,
      });
    },
  });

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          onOpenChange(false);
        }
      }}
      open={open}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <CatalogFormError
            error={mutation.error}
            title="Unable to save zone"
          />
          <FieldGroup className="py-2">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  value.trim().length < 1 ? "Name is required" : undefined,
              }}
            >
              {(field) => (
                <AppFormField
                  description="For example Aisle 4, Cold Storage, or Front Store."
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Name"
                  showErrors={field.state.meta.isBlurred}
                >
                  <Input
                    id={field.name}
                    maxLength={160}
                    onBlur={(event) => {
                      field.setValue(event.target.value.trim());
                      field.handleBlur();
                    }}
                    onChange={(event) => field.handleChange(event.target.value)}
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
            <form.Field name="description">
              {(field) => (
                <AppFormField
                  description="Optional context about how stock is handled in this area."
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Description"
                  showErrors={field.state.meta.isBlurred}
                >
                  <Textarea
                    id={field.name}
                    maxLength={1000}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
          </FieldGroup>
          <DialogFooter showCloseButton>
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  disabled={!canSubmit || isSubmitting || mutation.isPending}
                  type="submit"
                >
                  {isSubmitting || mutation.isPending ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Saving...
                    </>
                  ) : (
                    "Save zone"
                  )}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
