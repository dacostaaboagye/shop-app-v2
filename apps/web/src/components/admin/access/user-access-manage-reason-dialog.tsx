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
  assignAdminUserRole,
  removeAdminUserPermissionOverride,
  revokeAdminUserRole,
  setAdminUserPermissionOverride,
} from "@/lib/react-query/admin-user-access";
import {
  getDialogMeta,
  type ReasonDialogState,
} from "./user-access-manage-support";

export function UserAccessManageReasonDialog({
  onClose,
  open,
  slug,
  state,
}: {
  onClose: () => void;
  open: boolean;
  slug: string;
  state: ReasonDialogState;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      switch (state.kind) {
        case "allow-override":
          return setAdminUserPermissionOverride(slug, {
            effect: "allow",
            locationSlug: null,
            permissionKey: state.permissionKey,
            reason,
          });
        case "assign-role":
          return assignAdminUserRole(slug, {
            locationSlug: null,
            reason,
            roleSlug: state.roleSlug,
          });
        case "deny-override":
          return setAdminUserPermissionOverride(slug, {
            effect: "deny",
            locationSlug: null,
            permissionKey: state.permissionKey,
            reason,
          });
        case "remove-override":
          return removeAdminUserPermissionOverride(
            slug,
            state.override.permissionKey,
            {
              locationSlug: null,
              reason,
            },
          );
        case "revoke-role":
          return revokeAdminUserRole(slug, state.assignment.roleSlug, {
            locationSlug: null,
            reason,
          });
        default:
          throw new Error("No access action is selected.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminUserAccessDetailQueryKey(slug),
      });
      form.reset();
      onClose();
    },
  });
  const form = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => mutation.mutate({ reason: value.reason }),
  });

  if (state.kind === "closed") {
    return null;
  }

  const meta = getDialogMeta(state);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          mutation.reset();
          form.reset();
          onClose();
        }
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
                  showErrors={field.state.meta.isBlurred || mutation.isError}
                >
                  <Textarea
                    disabled={form.state.isSubmitting}
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
                  disabled={!canSubmit || isSubmitting}
                  type="submit"
                  variant={meta.destructive ? "destructive" : "default"}
                >
                  {isSubmitting ? (
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
