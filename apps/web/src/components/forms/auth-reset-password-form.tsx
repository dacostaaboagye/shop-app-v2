"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";
import { resetPassword } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/auth-messages";

type AuthResetPasswordFormProps = {
  token: string;
  onSuccess: () => void;
};

export function AuthResetPasswordForm({
  token,
  onSuccess,
}: AuthResetPasswordFormProps) {
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (newPassword: string) => resetPassword(token, newPassword),
    onSuccess,
  });

  const authError = mutation.error ? getAuthErrorMessage(mutation.error) : null;

  const form = useForm({
    defaultValues: { password: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value.password);
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
              label="New password"
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

        <form.Field
          name="confirmPassword"
          validators={{
            onBlur: ({ value, fieldApi }) =>
              value.trim()
                ? validateConfirm(
                    value,
                    fieldApi.form.getFieldValue("password"),
                  )
                : undefined,
            onSubmit: ({ value, fieldApi }) =>
              validateConfirm(value, fieldApi.form.getFieldValue("password")),
          }}
        >
          {(field) => (
            <AppFormField
              errors={field.state.meta.errors}
              inputId={field.name}
              label="Confirm password"
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
                placeholder="Re-enter your password"
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
                Saving…
              </>
            ) : (
              <>
                Set new password
                <KeyRound data-icon="inline-end" />
              </>
            )}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

function validatePassword(value: string) {
  if (!value.trim()) return "Create a password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(value)) return "Include at least one uppercase letter.";
  if (!/[a-z]/.test(value)) return "Include at least one lowercase letter.";
  if (!/[0-9]/.test(value)) return "Include at least one number.";
  return undefined;
}

function validateConfirm(value: string, password: string) {
  if (!value.trim()) return "Confirm your password.";
  if (value !== password) return "Passwords do not match.";
  return undefined;
}
