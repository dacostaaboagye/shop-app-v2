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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  adminUserAccessDetailQueryKey,
  updateAdminUserStatus,
} from "@/lib/react-query/admin-user-access";
import { toast } from "@/lib/toast";

const USER_STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Deactivated", value: "deactivated" },
] as const;

export function UpdateStatusDialog({
  currentStatus,
  onClose,
  open,
  slug,
}: {
  currentStatus: string;
  onClose: () => void;
  open: boolean;
  slug: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: { reason: string; status: string }) =>
      updateAdminUserStatus(slug, {
        reason: values.reason,
        status: values.status as "active" | "deactivated" | "suspended",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminUserAccessDetailQueryKey(slug),
      });
      toast.success("Status updated");
      onClose();
    },
  });
  const form = useForm({
    defaultValues: { reason: "", status: currentStatus },
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
            <DialogTitle>Update account status</DialogTitle>
            <DialogDescription>
              Suspending or deactivating immediately revokes all refresh tokens.
            </DialogDescription>
          </DialogHeader>
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to update status</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "An unexpected error occurred."}
              </AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup className="py-2">
            <form.Field
              name="status"
              validators={{
                onSubmit: ({ value }) =>
                  value ? undefined : "Select a status.",
              }}
            >
              {(field) => (
                <AppFormField
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="New status"
                  showErrors={field.state.meta.isBlurred || mutation.isError}
                >
                  <Select
                    disabled={form.state.isSubmitting}
                    onValueChange={(value) => field.handleChange(value)}
                    value={field.state.value}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AppFormField>
              )}
            </form.Field>
            <form.Field
              name="reason"
              validators={{
                onBlur: ({ value }) =>
                  value.trim()
                    ? undefined
                    : "Provide a reason for this status change.",
                onSubmit: ({ value }) =>
                  value.trim()
                    ? undefined
                    : "Provide a reason for this status change.",
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
                    placeholder="Account suspended pending HR review."
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
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  {isSubmitting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Updating…
                    </>
                  ) : (
                    "Update status"
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
