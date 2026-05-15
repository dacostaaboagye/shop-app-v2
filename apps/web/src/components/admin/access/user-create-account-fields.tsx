"use client";

import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  validateEmail,
  validateName,
  validateRequired,
} from "./user-create-form.support";
import type { UserCreateFormHandle } from "./user-create-form.types";
import {
  UserCreateProfileImageField,
  validateOptionalProfileImage,
} from "./user-create-profile-image-field";

export function UserCreateAccountFields({
  disabled,
  form,
  showProfileImage,
  wasSubmitted,
}: {
  disabled: boolean;
  form: UserCreateFormHandle;
  showProfileImage: boolean;
  wasSubmitted: boolean;
}) {
  const identityFields = (
    <FieldGroup>
      <form.Field
        name="firstName"
        validators={{
          onBlur: ({ value }: { value: string }) =>
            validateName(value, "a first name"),
          onSubmit: ({ value }: { value: string }) =>
            validateName(value, "a first name"),
        }}
      >
        {(field) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="First name"
            showErrors={
              (field.state.meta.isDirty && field.state.meta.isBlurred) ||
              wasSubmitted
            }
          >
            <Input
              disabled={disabled}
              id={field.name}
              maxLength={80}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Ama"
              value={String(field.state.value ?? "")}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field
        name="lastName"
        validators={{
          onBlur: ({ value }: { value: string }) =>
            validateName(value, "a last name"),
          onSubmit: ({ value }: { value: string }) =>
            validateName(value, "a last name"),
        }}
      >
        {(field) => (
          <AppFormField
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Last name"
            showErrors={
              (field.state.meta.isDirty && field.state.meta.isBlurred) ||
              wasSubmitted
            }
          >
            <Input
              disabled={disabled}
              id={field.name}
              maxLength={80}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Mensah"
              value={String(field.state.value ?? "")}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field
        name="email"
        validators={{
          onBlur: ({ value }: { value: string }) => validateEmail(value),
          onSubmit: ({ value }: { value: string }) => validateEmail(value),
        }}
      >
        {(field) => (
          <AppFormField
            description="The user will use this email for password setup and sign-in."
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Email"
            showErrors={
              (field.state.meta.isDirty && field.state.meta.isBlurred) ||
              wasSubmitted
            }
          >
            <Input
              disabled={disabled}
              id={field.name}
              maxLength={254}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="ama@example.com"
              type="email"
              value={String(field.state.value ?? "")}
            />
          </AppFormField>
        )}
      </form.Field>

      <form.Field
        name="reason"
        validators={{
          onBlur: ({ value }: { value: string }) =>
            validateRequired(value, "Enter an audit reason."),
          onSubmit: ({ value }: { value: string }) =>
            validateRequired(value, "Enter an audit reason."),
        }}
      >
        {(field) => (
          <AppFormField
            description="Stored with the access audit trail."
            errors={field.state.meta.errors}
            inputId={field.name}
            label="Reason"
            showErrors={
              (field.state.meta.isDirty && field.state.meta.isBlurred) ||
              wasSubmitted
            }
          >
            <Textarea
              disabled={disabled}
              id={field.name}
              maxLength={500}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="New hire for the Accra Central Store."
              value={String(field.state.value ?? "")}
            />
          </AppFormField>
        )}
      </form.Field>
    </FieldGroup>
  );

  if (showProfileImage) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)] lg:items-start">
        <form.Field
          name="profileImage"
          validators={{
            onChange: ({ value }: { value: File | null }) =>
              validateOptionalProfileImage(value),
            onSubmit: ({ value }: { value: File | null }) =>
              validateOptionalProfileImage(value),
          }}
        >
          {(field) => (
            <UserCreateProfileImageField
              disabled={disabled}
              field={field}
              showErrors={
                (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                wasSubmitted
              }
            />
          )}
        </form.Field>
        {identityFields}
      </div>
    );
  }

  return identityFields;
}
