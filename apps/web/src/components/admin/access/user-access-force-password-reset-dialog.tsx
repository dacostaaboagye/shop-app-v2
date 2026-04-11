"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  adminUserAccessDetailQueryKey,
  forceAdminUserPasswordReset,
} from "@/lib/react-query/admin-user-access";
import { toast } from "@/lib/toast";

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
      onClose();
    },
  });
  const form = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => mutation.mutate(value),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Force password reset</DialogTitle>
            <DialogDescription>
              The user must set a new password on next login. All active
              sessions are revoked immediately.
            </DialogDescription>
          </DialogHeader>
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to force reset</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "An unexpected error occurred."}
              </AlertDescription>
            </Alert>
          ) : null}
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
                    placeholder="Possible credential exposure reported by security team."
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
                  disabled={!canSubmit || isSubmitting}
                  type="submit"
                  variant="destructive"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Resetting…
                    </>
                  ) : (
                    "Force reset"
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
