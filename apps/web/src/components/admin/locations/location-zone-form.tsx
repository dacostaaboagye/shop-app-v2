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
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit zone" : "Add zone"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update storage zone details."
                : "Create a new storage zone within this location."}
            </DialogDescription>
          </DialogHeader>
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save zone</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "An unexpected error occurred."}
              </AlertDescription>
            </Alert>
          ) : null}
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
                  description="e.g. Aisle 4, Cold Storage, Front Store"
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Name"
                  showErrors={field.state.meta.isBlurred}
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
            <form.Field name="description">
              {(field) => (
                <AppFormField
                  description="Optional context about what is stored here"
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Description"
                  showErrors={field.state.meta.isBlurred}
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
                      Saving…
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
