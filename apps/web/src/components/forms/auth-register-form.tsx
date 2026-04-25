"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AuthGoogleOAuthButton } from "@/components/forms/auth-google-oauth-button";
import { AppErrorBanner } from "@/components/system/app-error";
import { AuthSectionDivider } from "@/components/system/auth-surfaces";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { register } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/auth-messages";
import {
  currentUserPermissionsQueryKeyPrefix,
  currentUserQueryKey,
} from "@/lib/react-query/auth";
import {
  registerDefaults,
  validateName,
  validateRegisterEmail,
  validateRegisterPassword,
} from "./auth-register-form.support";

export function AuthRegisterForm() {
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess(session) {
      queryClient.setQueryData(currentUserQueryKey, session.user);
      queryClient.removeQueries({
        queryKey: currentUserPermissionsQueryKeyPrefix,
      });
    },
  });

  const authError = registerMutation.error
    ? getAuthErrorMessage(registerMutation.error)
    : null;

  const form = useForm({
    defaultValues: registerDefaults,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      await registerMutation.mutateAsync(value);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <AuthGoogleOAuthButton />
      <AuthSectionDivider />

      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setWasSubmitted(true);
          void form.handleSubmit();
        }}
      >
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field
              name="firstName"
              validators={{
                onBlur: ({ value }) =>
                  value.trim() ? validateName(value, "first") : undefined,
                onSubmit: ({ value }) => validateName(value, "first"),
              }}
            >
              {(field) => (
                <AppFormField
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="First Name"
                  showErrors={
                    (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                    wasSubmitted
                  }
                >
                  <Input
                    autoComplete="given-name"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Solomon"
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>

            <form.Field
              name="lastName"
              validators={{
                onBlur: ({ value }) =>
                  value.trim() ? validateName(value, "last") : undefined,
                onSubmit: ({ value }) => validateName(value, "last"),
              }}
            >
              {(field) => (
                <AppFormField
                  errors={field.state.meta.errors}
                  inputId={field.name}
                  label="Last Name"
                  showErrors={
                    (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                    wasSubmitted
                  }
                >
                  <Input
                    autoComplete="family-name"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Aboagye"
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
          </div>

          <form.Field
            name="email"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? validateRegisterEmail(value) : undefined,
              onSubmit: ({ value }) => validateRegisterEmail(value),
            }}
          >
            {(field) => (
              <AppFormField
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Email"
                showErrors={
                  (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                  wasSubmitted
                }
              >
                <Input
                  autoComplete="email"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="name@company.com"
                  type="email"
                  value={field.state.value}
                />
              </AppFormField>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onBlur: ({ value }) =>
                value.trim() ? validateRegisterPassword(value) : undefined,
              onSubmit: ({ value }) => validateRegisterPassword(value),
            }}
          >
            {(field) => (
              <AppFormField
                errors={field.state.meta.errors}
                inputId={field.name}
                label="Password"
                showErrors={
                  (field.state.meta.isDirty && field.state.meta.isBlurred) ||
                  wasSubmitted
                }
              >
                <PasswordInput
                  autoComplete="new-password"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Minimum 8 characters"
                  value={field.state.value}
                />
              </AppFormField>
            )}
          </form.Field>
        </FieldGroup>

        {authError ? (
          <AppErrorBanner
            detail={authError.detail}
            error={registerMutation.error}
            title={authError.title}
          />
        ) : null}

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              className="w-full"
              disabled={!canSubmit || isSubmitting}
              size="lg"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <UserRoundPlus className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
