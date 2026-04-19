"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppErrorBanner } from "@/components/system/app-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { forgotPassword } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/auth-messages";

export function AuthForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (email: string) => forgotPassword(email),
    onSuccess() {
      setSent(true);
    },
  });

  const authError = mutation.error ? getAuthErrorMessage(mutation.error) : null;

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value.email);
    },
  });

  if (sent) {
    return (
      <Alert variant="success">
        <MailCheck className="h-4 w-4" />
        <AlertTitle>Check your inbox</AlertTitle>
        <AlertDescription>
          If that email is registered, a reset link is on its way. Check your
          spam folder if you don&apos;t see it within a few minutes.
        </AlertDescription>
      </Alert>
    );
  }

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
      </FieldGroup>

      {authError ? (
        <AppErrorBanner
          detail={authError.detail}
          error={mutation.error}
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
                Sending…
              </>
            ) : (
              "Send reset link"
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
