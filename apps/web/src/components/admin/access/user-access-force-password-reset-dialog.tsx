"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppFormField } from "@/components/forms/app-form-field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  adminUserAccessDetailQueryKey,
  forceAdminUserPasswordReset,
} from "@/lib/react-query/admin-user-access";
import { toast } from "@/lib/toast";
import {
  UserAccessDialogError,
  UserAccessDialogHeader,
  UserAccessDialogSubmit,
} from "./user-access-dialog-surfaces";

export function ForcePasswordResetDialog({
  onClose,
  open,
  slug,
}: {
  onClose: () => void;
  open: boolean;
  slug: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: { reason: string }) =>
      forceAdminUserPasswordReset(slug, { reason: values.reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminUserAccessDetailQueryKey(slug),
      });
      toast.success("Password reset forced");
      form.reset({ reason: "" });
      onClose();
    },
  });
  const form = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => mutation.mutateAsync(value),
  });

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          mutation.reset();
          form.reset({ reason: "" });
          onClose();
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <UserAccessDialogHeader
            description="The user must set a new password on next login. Active sessions are revoked immediately."
            title="Force password reset"
          />
          <UserAccessDialogError
            error={mutation.error}
            title="Failed to force reset"
          />
          <FieldGroup className="py-2">
            <form.Field
              name="reason"
              validators={{
                onBlur: ({ value }) =>
                  value.trim()
                    ? undefined
                    : "Provide a reason for forcing a reset.",
                onSubmit: ({ value }) =>
                  value.trim()
                    ? undefined
                    : "Provide a reason for forcing a reset.",
              }}
            >
              {(field) => (
                <AppFormField
                  description="Stored in the audit log."
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Reason"
                  showErrors={field.state.meta.isBlurred || mutation.isError}
                >
                  <Textarea
                    disabled={form.state.isSubmitting}
                    id={field.name}
                    maxLength={500}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Possible credential exposure reported by security."
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
                isBusy={isSubmitting}
                label="Force reset"
                pendingLabel="Resetting..."
                variant="destructive"
              />
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
