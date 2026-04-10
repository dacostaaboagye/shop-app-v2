"use client";

import type { AdminLocationZoneSummary } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit zone" : "Add zone"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update storage zone details."
              : "Create a new storage zone within this location."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  Number(value.trim().length) < 1
                    ? "Name is required"
                    : undefined,
              }}
            >
              {(field) => (
                <AppFormField
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Name"
                  showErrors={field.state.meta.isBlurred}
                  description="e.g. Aisle 4, Cold Storage, Front Store"
                >
                  <Input
                    id={field.name}
                    maxLength={160}
                    onBlur={(e) => {
                      field.setValue(e.target.value.trim());
                      field.handleBlur();
                    }}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>

            <form.Field name="description" validators={{}}>
              {(field) => (
                <AppFormField
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Description"
                  showErrors={field.state.meta.isBlurred}
                  description="Optional context about what is stored here"
                >
                  <Textarea
                    id={field.name}
                    maxLength={1000}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
          </div>

          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save zone</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "An unexpected error occurred."}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
              disabled={form.state.isSubmitting}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  disabled={!canSubmit || (isSubmitting as boolean)}
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner />
                      Saving...
                    </>
                  ) : (
                    "Save zone"
                  )}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
