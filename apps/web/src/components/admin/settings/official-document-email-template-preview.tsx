"use client";

import type {
  EmailTemplatePreviewRequest,
  EmailTemplatePreviewResponse,
} from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { type CSSProperties, useDeferredValue } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  emailTemplatePreviewQueryKey,
  previewEmailTemplate,
} from "@/lib/react-query/official-documents";
import {
  EMAIL_TEMPLATE_TABS,
  type EmailTemplateTabKey,
} from "./official-document-email-template-fields";
import type { OfficialDocumentSettingsFormValues } from "./official-document-settings-form.support";

export function OfficialDocumentEmailTemplatePreview({
  activeTemplate,
  logoImageUrl,
  values,
}: {
  activeTemplate: EmailTemplateTabKey;
  logoImageUrl: string | null;
  values: OfficialDocumentSettingsFormValues;
}) {
  const template = getTemplateDraft(activeTemplate, values);
  const draftPayload = getPreviewPayload(activeTemplate, logoImageUrl, values);
  const payload = useDeferredValue(draftPayload);
  const previewQuery = useQuery({
    queryFn: () => previewEmailTemplate({ payload, type: activeTemplate }),
    queryKey: emailTemplatePreviewQueryKey(activeTemplate, payload),
    staleTime: 5_000,
  });
  const primaryColor = cssColor(values.primaryColor);
  const accentColor = cssColor(values.accentColor);

  return (
    <section
      className="h-fit overflow-hidden"
      style={
        {
          "--email-accent": accentColor,
          "--email-primary": primaryColor,
        } as CSSProperties
      }
    >
      {previewQuery.isError ? (
        <AppErrorBanner
          detail="Could not render the server email preview."
          error={previewQuery.error}
          title="Preview unavailable"
        />
      ) : null}
      <EmailClientPreview
        accentColor={accentColor}
        primaryColor={primaryColor}
        serverPreview={previewQuery.data}
        template={template}
        isLoading={previewQuery.isLoading || previewQuery.isFetching}
      />
    </section>
  );
}

function EmailClientPreview({
  accentColor,
  isLoading,
  primaryColor,
  serverPreview,
  template,
}: {
  accentColor: string;
  isLoading: boolean;
  primaryColor: string;
  serverPreview: EmailTemplatePreviewResponse | undefined;
  template: ReturnType<typeof getTemplateDraft>;
}) {
  const subject = serverPreview?.subject ?? template.raw.subject;
  const previewText = serverPreview?.text ?? "Server-rendered email preview";

  return (
    <div className="mx-auto max-w-[560px] overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <div className="h-1.5" style={{ backgroundColor: primaryColor }} />
      <div className="border-b border-border/70 bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{subject}</p>
            <p className="truncate text-xs text-muted-foreground">
              {previewText}
            </p>
          </div>
          <Badge variant="outline">{template.label}</Badge>
        </div>
      </div>

      <div className="bg-muted/40 p-3">
        <div
          className="mb-3 h-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
          }}
        />
        {isLoading && !serverPreview ? (
          <div className="grid gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[460px] w-full" />
          </div>
        ) : serverPreview ? (
          <iframe
            className="h-[520px] w-full rounded-md border border-border bg-background"
            sandbox=""
            srcDoc={serverPreview.html}
            title={`${template.label} rendered email preview`}
          />
        ) : (
          <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
            Email preview will appear after the template renders.
          </div>
        )}
      </div>

      <div className="border-t border-border/60 bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Variables
          </span>
          {(serverPreview?.allowedVariables ?? ["firstName"]).map(
            (variable) => (
              <Badge key={variable} variant="secondary">
                {variable}
              </Badge>
            ),
          )}
          {serverPreview?.unknownVariables.map((variable) => (
            <Badge key={variable} variant="destructive">
              Unknown: {variable}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function getPreviewPayload(
  key: EmailTemplateTabKey,
  logoImageUrl: string | null,
  values: OfficialDocumentSettingsFormValues,
): EmailTemplatePreviewRequest {
  const template = getTemplateDraft(key, values);
  return {
    brand: {
      accentColor: values.accentColor,
      brandName: values.brandName,
      logoImageUrl,
      logoText: values.logoText,
      primaryColor: values.primaryColor,
    },
    business: { email: values.email },
    template: template.raw,
  };
}

function getTemplateDraft(
  key: EmailTemplateTabKey,
  values: OfficialDocumentSettingsFormValues,
) {
  const tab = EMAIL_TEMPLATE_TABS.find((item) => item.key === key);
  const prefix = tab?.prefix;
  if (!prefix) {
    return {
      label: "Email",
      raw: {
        actionLabel: "",
        footer: "",
        heading: "",
        intro: "",
        subject: "",
      },
    };
  }

  return {
    label: tab.label,
    raw: {
      actionLabel: values[`${prefix}ActionLabel`],
      footer: values[`${prefix}Footer`],
      heading: values[`${prefix}Heading`],
      intro: values[`${prefix}Intro`],
      subject: values[`${prefix}Subject`],
    },
  };
}

function cssColor(value: string) {
  const trimmed = value.trim();
  return trimmed || "var(--primary)";
}
