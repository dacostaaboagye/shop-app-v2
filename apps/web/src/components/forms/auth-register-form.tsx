"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

const registerDefaults = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
};

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
                label="First name"
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
                  onChange={(e) => field.handleChange(e.target.value)}
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
                label="Last name"
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
                  onChange={(e) => field.handleChange(e.target.value)}
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
              value.trim() ? validateEmail(value) : undefined,
            onSubmit: ({ value }) => validateEmail(value),
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
                onChange={(e) => field.handleChange(e.target.value)}
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
              value.trim() ? validatePassword(value) : undefined,
            onSubmit: ({ value }) => validatePassword(value),
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
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Min. 8 characters"
                value={field.state.value}
              />
            </AppFormField>
          )}
        </form.Field>
      </FieldGroup>

      {authError ? (
        <Alert variant="destructive">
          <AlertTitle>{authError.title}</AlertTitle>
          <AlertDescription>{authError.detail}</AlertDescription>
        </Alert>
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
                Creating account…
              </>
            ) : (
              <>
                Create account
                <UserRoundPlus data-icon="inline-end" />
              </>
            )}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

function validateEmail(value: string) {
  if (!value.trim()) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return "Enter a valid email address.";
  return undefined;
}

function validateName(value: string, part: "first" | "last") {
  if (!value.trim()) return `Enter your ${part} name.`;
  return undefined;
}

function validatePassword(value: string) {
  if (!value.trim()) return "Create a password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return undefined;
}
