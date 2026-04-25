import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { OfficialDocumentSettingsFormApi } from "./official-document-identity-fields";

export const EMAIL_TEMPLATE_TABS = [
  {
    key: "supplierInvite",
    label: "Supplier invite",
    prefix: "supplierInvite",
  },
  {
    key: "passwordReset",
    label: "Password reset",
    prefix: "passwordReset",
  },
  {
    key: "emailVerification",
    label: "Email verification",
    prefix: "emailVerification",
  },
] as const;

export type EmailTemplateTabKey = (typeof EMAIL_TEMPLATE_TABS)[number]["key"];

type TemplatePrefix = (typeof EMAIL_TEMPLATE_TABS)[number]["prefix"];
type TemplateFieldName =
  | `${TemplatePrefix}ActionLabel`
  | `${TemplatePrefix}Footer`
  | `${TemplatePrefix}Heading`
  | `${TemplatePrefix}Intro`
  | `${TemplatePrefix}Subject`;

export function OfficialDocumentEmailTemplateFields({
  activeTemplate,
  form,
  onTemplateChange,
}: {
  activeTemplate: EmailTemplateTabKey;
  form: OfficialDocumentSettingsFormApi;
  onTemplateChange: (value: EmailTemplateTabKey) => void;
}) {
  return (
    <Tabs
      className="w-full"
      onValueChange={(value) => onTemplateChange(value as EmailTemplateTabKey)}
      value={activeTemplate}
    >
      <TabsList>
        {EMAIL_TEMPLATE_TABS.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {EMAIL_TEMPLATE_TABS.map((tab) => (
        <TabsContent key={tab.key} value={tab.key}>
          <FieldGroup>
            <TemplateInput
              description="Email subject line shown in the recipient inbox."
              form={form}
              label="Subject"
              name={`${tab.prefix}Subject`}
              placeholder={getTemplatePlaceholder(tab.key, "subject")}
            />
            <TemplateInput
              description="Main headline shown at the top of the email body."
              form={form}
              label="Heading"
              name={`${tab.prefix}Heading`}
              placeholder={getTemplatePlaceholder(tab.key, "heading")}
            />
            <TemplateTextarea
              description="Short introduction before the main action. Variables such as {{firstName}} and {{supplierName}} can be used where supported."
              form={form}
              label="Intro"
              name={`${tab.prefix}Intro`}
              placeholder={getTemplatePlaceholder(tab.key, "intro")}
              rows={4}
            />
            <TemplateInput
              description="Primary call-to-action label shown on the email button."
              form={form}
              label="Button label"
              name={`${tab.prefix}ActionLabel`}
              placeholder={getTemplatePlaceholder(tab.key, "actionLabel")}
            />
            <TemplateTextarea
              description="Supporting footer copy shown beneath the main email content."
              form={form}
              label="Footer"
              name={`${tab.prefix}Footer`}
              placeholder={getTemplatePlaceholder(tab.key, "footer")}
              rows={4}
            />
          </FieldGroup>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TemplateInput({
  description,
  form,
  label,
  name,
  placeholder,
}: {
  description?: string;
  form: OfficialDocumentSettingsFormApi;
  label: string;
  name: TemplateFieldName;
  placeholder?: string;
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <AppFormField
          inputId={field.name}
          label={label}
          {...(description ? { description } : {})}
        >
          <Input
            id={field.name}
            maxLength={160}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder={placeholder}
            value={String(field.state.value)}
          />
        </AppFormField>
      )}
    </form.Field>
  );
}

function TemplateTextarea({
  description,
  form,
  label,
  name,
  placeholder,
  rows,
}: {
  description?: string;
  form: OfficialDocumentSettingsFormApi;
  label: string;
  name: TemplateFieldName;
  placeholder?: string;
  rows: number;
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <AppFormField
          inputId={field.name}
          label={label}
          {...(description ? { description } : {})}
        >
          <Textarea
            id={field.name}
            maxLength={800}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder={placeholder}
            rows={rows}
            value={String(field.state.value)}
          />
        </AppFormField>
      )}
    </form.Field>
  );
}

function getTemplatePlaceholder(
  key: EmailTemplateTabKey,
  field: "actionLabel" | "footer" | "heading" | "intro" | "subject",
) {
  const placeholders: Record<
    EmailTemplateTabKey,
    Record<typeof field, string>
  > = {
    emailVerification: {
      actionLabel: "Verify email",
      footer: "If you did not create this account, you can ignore this email.",
      heading: "Verify your email address",
      intro:
        "Hello {{firstName}}, confirm your email address to activate your account.",
      subject: "Verify your email address",
    },
    passwordReset: {
      actionLabel: "Reset password",
      footer: "If you did not request this reset, you can ignore this email.",
      heading: "Reset your password",
      intro: "Hello {{firstName}}, use the button below to set a new password.",
      subject: "Reset your password",
    },
    supplierInvite: {
      actionLabel: "Open supplier portal",
      footer:
        "If you were not expecting this invitation, please contact our team.",
      heading: "You have been invited",
      intro:
        "Hello {{firstName}}, you have been invited to manage {{supplierName}} in the supplier portal.",
      subject: "Supplier portal invitation",
    },
  };

  return placeholders[key][field];
}
