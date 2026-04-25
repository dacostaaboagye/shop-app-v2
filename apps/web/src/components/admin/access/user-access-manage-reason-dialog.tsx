"use client";

import type { AdminLocationSummary } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminUserAccessDetailQueryKey } from "@/lib/react-query/admin-user-access";
import { toast } from "@/lib/toast";
import {
  UserAccessDialogError,
  UserAccessDialogHeader,
  UserAccessDialogSubmit,
} from "./user-access-dialog-surfaces";
import { submitUserAccessReasonAction } from "./user-access-manage-actions";
import {
  getDialogMeta,
  isReasonDialogPending,
  type ReasonDialogState,
  roleRequiresLocationScope,
} from "./user-access-manage-support";

const GLOBAL_SCOPE_VALUE = "__global__";

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
  const activeLocations = useMemo(
    () => allLocations.filter((location) => location.status === "active"),
    [allLocations],
  );

  const meta = getDialogMeta(state);
  const scopeIsRequired =
    state.kind === "assign-role" && roleRequiresLocationScope(state.roleSlug);
  const form = useForm({
    defaultValues: {
      locationSlug: scopeIsRequired ? "" : GLOBAL_SCOPE_VALUE,
      reason: "",
    },
    onSubmit: async ({ value }) =>
      mutation.mutateAsync({
        locationSlug:
          value.locationSlug === GLOBAL_SCOPE_VALUE ? "" : value.locationSlug,
        reason: value.reason,
      }),
  });
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
  const isPending = isReasonDialogPending({
    formIsSubmitting: form.state.isSubmitting,
    mutationIsPending: mutation.isPending,
  });

  if (state.kind === "closed") {
    return null;
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          mutation.reset();
          setWasSubmitted(false);
          form.reset();
          onClose();
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setWasSubmitted(true);
            void form.handleSubmit();
          }}
        >
          <UserAccessDialogHeader
            description={meta.description}
            title={meta.title}
          />
          <UserAccessDialogError error={mutation.error} title="Action failed" />
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
                        ? "Manager and worker access is always scoped to a location."
                        : "Choose a location only when the role should stay scoped."
                    }
                    errors={field.state.meta.errors}
                    inputId={field.name}
                    label="Location scope"
                    showErrors={field.state.meta.isBlurred || wasSubmitted}
                  >
                    <Select
                      disabled={isPending}
                      onValueChange={field.handleChange}
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
                        {!scopeIsRequired ? (
                          <SelectItem value={GLOBAL_SCOPE_VALUE}>
                            Global
                          </SelectItem>
                        ) : null}
                        {activeLocations.map((location) => (
                          <SelectItem key={location.slug} value={location.slug}>
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

          <form.Subscribe
            selector={(formState) => ({
              canSubmit: formState.canSubmit,
              isSubmitting: formState.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <UserAccessDialogSubmit
                canSubmit={canSubmit}
                isBusy={isReasonDialogPending({
                  formIsSubmitting: isSubmitting,
                  mutationIsPending: mutation.isPending,
                })}
                label={meta.submitLabel}
                pendingLabel="Saving..."
                variant={meta.destructive ? "destructive" : "default"}
              />
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
