"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  adminUserAccessDetailQueryKey,
  updateAdminUserStatus,
} from "@/lib/react-query/admin-user-access";
import { toast } from "@/lib/toast";
import {
  UserAccessDialogError,
  UserAccessDialogHeader,
  UserAccessDialogSubmit,
} from "./user-access-dialog-surfaces";

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
      form.reset({ reason: "", status: currentStatus });
      onClose();
    },
  });
  const form = useForm({
    defaultValues: { reason: "", status: currentStatus },
    onSubmit: async ({ value }) => mutation.mutateAsync(value),
  });

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          mutation.reset();
          form.reset({ reason: "", status: currentStatus });
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
            description="Suspending or deactivating immediately revokes active refresh tokens."
            title="Update account status"
          />
          <UserAccessDialogError
            error={mutation.error}
            title="Failed to update status"
          />
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
                    onValueChange={field.handleChange}
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
                label="Update status"
                pendingLabel="Updating..."
              />
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
