"use client";

import type { AdminLocationSummary, AdminRoleSummary } from "@shop/contracts";
import {
  CatalogFormActions,
  CatalogFormCard,
  CatalogFormError,
} from "@/components/admin/catalog/catalog-form-surfaces";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppBanner } from "@/components/system/app-banner";
import { UserCreateAccountFields } from "./user-create-account-fields";
import {
  type UserCreateRoleAssignmentValue,
  validateRoleAssignments,
} from "./user-create-form.support";
import type {
  UserCreateFormHandle,
  UserCreateFormState,
  UserCreateMutationState,
} from "./user-create-form.types";
import { UserCreateRoleAssignments } from "./user-create-role-assignments";

type UserCreateFormProps = {
  canUploadProfileImage: boolean;
  form: unknown;
  locations: readonly AdminLocationSummary[];
  mutation: unknown;
  onCancel: () => void;
  roles: readonly AdminRoleSummary[];
  setWasSubmitted: (value: boolean) => void;
  submitLabel?: string;
  submittingLabel?: string;
  wasSubmitted: boolean;
};

export function UserCreateForm({
  canUploadProfileImage,
  form,
  locations,
  mutation,
  onCancel,
  roles,
  setWasSubmitted,
  submitLabel = "Create user",
  submittingLabel = "Creating...",
  wasSubmitted,
}: UserCreateFormProps) {
  const createForm = form as UserCreateFormHandle;
  const createMutation = mutation as UserCreateMutationState;

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setWasSubmitted(true);
        void createForm.handleSubmit();
      }}
    >
      <AppBanner
        description="After creation, ask the user to open the sign-in page and use Forgot password to set their password."
        title="Password setup"
        tone="info"
      />

      <CatalogFormError
        error={createMutation.isError ? createMutation.error : null}
        title="Unable to create user"
      />

      <CatalogFormCard
        description="Use the staff member's real identity. These values appear in directories, audit views, and role assignments."
        title="Account details"
      >
        <UserCreateAccountFields
          disabled={createMutation.isPending}
          form={createForm}
          showProfileImage={canUploadProfileImage}
          wasSubmitted={wasSubmitted}
        />
      </CatalogFormCard>

      <CatalogFormCard
        description="Choose the roles this staff member should have when the account is created. Manager and worker roles must be scoped to a location."
        title="Starting roles"
      >
        <createForm.Field
          name="roleAssignments"
          validators={{
            onSubmit: ({
              value,
            }: {
              value: readonly UserCreateRoleAssignmentValue[];
            }) => validateRoleAssignments(value),
          }}
        >
          {(field) => (
            <AppFormField
              description="Manager and worker roles must be scoped to an active location."
              errors={field.state.meta.errors}
              inputId="role-assignment-0-role"
              label="Role coverage"
              showErrors={wasSubmitted}
            >
              <UserCreateRoleAssignments
                assignments={
                  field.state.value as UserCreateRoleAssignmentValue[]
                }
                disabled={createMutation.isPending}
                locations={locations}
                onChange={field.handleChange}
                roles={roles}
              />
            </AppFormField>
          )}
        </createForm.Field>
      </CatalogFormCard>

      <createForm.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {(state) => {
          const submitState = state as UserCreateFormState;
          return (
            <CatalogFormActions
              canSubmit={submitState.canSubmit}
              isBusy={submitState.isSubmitting || createMutation.isPending}
              onCancel={onCancel}
              submitLabel={submitLabel}
              submittingLabel={submittingLabel}
            />
          );
        }}
      </createForm.Subscribe>
    </form>
  );
}
