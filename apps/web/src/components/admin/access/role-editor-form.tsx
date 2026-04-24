"use client";

import type { AdminPermissionSummary } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppBanner } from "@/components/system/app-banner";
import { FloatingActionBar } from "@/components/system/floating-action-bar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminRoleDetailQueryKey,
  createAdminRole,
  updateAdminRole,
} from "@/lib/react-query/admin-access";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { RolePermissionSelector } from "./role-permission-selector";

type RoleEditorFormProps = {
  initialValues: {
    description: string;
    name: string;
    permissionKeys: string[];
  };
  isSystem?: boolean;
  mode: "create" | "edit";
  permissionOptions: readonly AdminPermissionSummary[];
  roleSlug?: string;
};

export function RoleEditorForm({
  initialValues,
  isSystem = false,
  mode,
  permissionOptions,
  roleSlug,
}: RoleEditorFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [permissionSearch, setPermissionSearch] = useState("");
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const roleMutation = useMutation({
    mutationFn: async (value: typeof initialValues) => {
      if (mode === "create") {
        return createAdminRole(value);
      }

      if (!roleSlug) {
        throw new Error("Missing role identifier.");
      }

      return updateAdminRole(roleSlug, value);
    },
    onSuccess(role) {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "access", "roles"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "access", "permissions"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "access", "audit"],
      });
      void queryClient.invalidateQueries({
        queryKey: adminRoleDetailQueryKey(role.slug),
      });

      toast.success(mode === "create" ? "Role created" : "Role saved");
      if (mode === "create") {
        router.push(toRoute(`/admin/access/roles/${role.slug}`));
      }
    },
  });
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      await roleMutation.mutateAsync({
        description: value.description.trim(),
        name: value.name.trim(),
        permissionKeys: [...new Set(value.permissionKeys)].sort((a, b) =>
          a.localeCompare(b),
        ),
      });
    },
  });

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setWasSubmitted(true);
        void form.handleSubmit();
      }}
    >
      {isSystem && mode === "edit" ? (
        <AppBanner
          description="Changes to this role affect seeded platform access and should be reviewed carefully before saving."
          title="System role"
          tone="warning"
        />
      ) : null}

      {roleMutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to save role</AlertTitle>
          <AlertDescription>
            {roleMutation.error instanceof Error
              ? roleMutation.error.message
              : "Failed to save role."}
          </AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <form.Field
          name="name"
          validators={{
            onBlur: ({ value }) =>
              value.trim() ? undefined : "Enter a role name.",
            onSubmit: ({ value }) =>
              value.trim() ? undefined : "Enter a role name.",
          }}
        >
          {(field) => (
            <AppFormField
              errors={field.state.meta.errors}
              info="Short, descriptive name for the role (e.g. 'Store Manager')."
              inputId={field.name}
              label="Role name"
              showErrors={
                (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                wasSubmitted
              }
            >
              <Input
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Inventory controller"
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>

        <form.Field
          name="description"
          validators={{
            onBlur: ({ value }) =>
              value.trim() ? undefined : "Enter a short role description.",
            onSubmit: ({ value }) =>
              value.trim() ? undefined : "Enter a short role description.",
          }}
        >
          {(field) => (
            <AppFormField
              description="Describe the business purpose of this role so audits remain legible."
              errors={field.state.meta.errors}
              info="Provide context on why this role exists and what responsibilities it covers."
              inputId={field.name}
              label="Description"
              showErrors={
                (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                wasSubmitted
              }
            >
              <Textarea
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Grants catalogue and stock review access for operations supervisors."
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>
      </FieldGroup>

      <form.Field name="permissionKeys">
        {(field) => (
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-bold">Permission grants</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select the page visibility and action permissions this role
                should unlock.
              </p>
            </div>
            <RolePermissionSelector
              disabled={roleMutation.isPending}
              onChange={field.handleChange}
              permissions={permissionOptions}
              searchValue={permissionSearch}
              selectedKeys={field.state.value}
              setSearchValue={setPermissionSearch}
            />
          </section>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isDirty: state.isDirty,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isDirty }) => (
          <FloatingActionBar
            isSaving={roleMutation.isPending}
            isVisible={isDirty}
            onReset={() => {
              setPermissionSearch("");
              form.reset();
            }}
            onSave={() => void form.handleSubmit()}
            saveLabel={mode === "create" ? "Create role" : "Save role"}
          />
        )}
      </form.Subscribe>
    </form>
  );
}
