"use client";
import type { AdminLocationSummary } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { adminUserAccessDetailQueryKey } from "@/lib/react-query/admin-user-access";
import { toast } from "@/lib/toast";
import { submitUserAccessReasonAction } from "./user-access-manage-actions";
import {
  getDialogMeta,
  isReasonDialogPending,
  type ReasonDialogState,
  roleRequiresLocationScope,
} from "./user-access-manage-support";

export function UserAccessManageReasonDialog({
  allLocations,
  onClose,
  open,
  slug,
  state,
}: {
  allLocations: readonly AdminLocationSummary[];
  onClose: () => void;
  open: boolean;
  slug: string;
  state: ReasonDialogState;
}) {
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const mutation = useMutation({
    mutationFn: (value: { locationSlug: string; reason: string }) =>
      submitUserAccessReasonAction({ ...value, slug, state }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminUserAccessDetailQueryKey(slug),
      });
      toast.success("Access updated");
      setWasSubmitted(false);
      form.reset();
      onClose();
    },
  });
  const form = useForm({
    defaultValues: { locationSlug: "", reason: "" },
    onSubmit: async ({ value }) =>
      mutation.mutateAsync({
        locationSlug: value.locationSlug.trim(),
        reason: value.reason,
      }),
  });
  if (state.kind === "closed") {
    return null;
  }
  const meta = getDialogMeta(state);
  const scopeIsRequired =
    state.kind === "assign-role" && roleRequiresLocationScope(state.roleSlug);
  const isPending = isReasonDialogPending({
    formIsSubmitting: form.state.isSubmitting,
    mutationIsPending: mutation.isPending,
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          mutation.reset();
          setWasSubmitted(false);
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setWasSubmitted(true);
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{meta.title}</DialogTitle>
            <DialogDescription>{meta.description}</DialogDescription>
          </DialogHeader>
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "An unexpected error occurred."}
              </AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup className="py-2">
            {state.kind === "assign-role" ? (
              <form.Field
                name="locationSlug"
                validators={{
                  onBlur: ({ value }) =>
                    scopeIsRequired && !value.trim()
                      ? "Select a location for this role."
                      : undefined,
                  onSubmit: ({ value }) =>
                    scopeIsRequired && !value.trim()
                      ? "Select a location for this role."
                      : undefined,
                }}
              >
                {(field) => (
                  <AppFormField
                    description={
                      scopeIsRequired
                        ? "Manager and worker access is always scoped to one location."
                        : "Leave blank to assign this role globally."
                    }
                    errors={field.state.meta.errors}
                    inputId={field.name}
                    label="Location scope"
                    showErrors={field.state.meta.isBlurred || wasSubmitted}
                  >
                    <Select
                      disabled={isPending}
                      onValueChange={(value) => field.handleChange(value)}
                      value={field.state.value}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue
                          placeholder={
                            scopeIsRequired ? "Select a location" : "Global"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {scopeIsRequired ? "Select a location" : "Global"}
                        </SelectItem>
                        {allLocations
                          .filter((location) => location.status === "active")
                          .map((location) => (
                            <SelectItem
                              key={location.slug}
                              value={location.slug}
                            >
                              {location.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </AppFormField>
                )}
              </form.Field>
            ) : null}

            <form.Field
              name="reason"
              validators={{
                onBlur: ({ value }) =>
                  value.trim()
                    ? undefined
                    : "Provide a reason. It will be stored in the audit log.",
                onSubmit: ({ value }) =>
                  value.trim()
                    ? undefined
                    : "Provide a reason. It will be stored in the audit log.",
              }}
            >
              {(field) => (
                <AppFormField
                  description="All access changes are audited with actor and reason."
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Reason"
                  showErrors={
                    field.state.meta.isBlurred ||
                    mutation.isError ||
                    wasSubmitted
                  }
                >
                  <Textarea
                    disabled={isPending}
                    id={field.name}
                    maxLength={500}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Explain why this change is being made..."
                    rows={3}
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
                  disabled={!canSubmit || isPending}
                  type="submit"
                  variant={meta.destructive ? "destructive" : "default"}
                >
                  {isReasonDialogPending({
                    formIsSubmitting: isSubmitting,
                    mutationIsPending: mutation.isPending,
                  }) ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Saving...
                    </>
                  ) : (
                    meta.submitLabel
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
