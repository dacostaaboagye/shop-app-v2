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
              form={form}
              label="Subject"
              name={`${tab.prefix}Subject`}
            />
            <TemplateInput
              form={form}
              label="Heading"
              name={`${tab.prefix}Heading`}
            />
            <TemplateTextarea
              form={form}
              label="Intro"
              name={`${tab.prefix}Intro`}
              rows={4}
            />
            <TemplateInput
              form={form}
              label="Button label"
              name={`${tab.prefix}ActionLabel`}
            />
            <TemplateTextarea
              form={form}
              label="Footer"
              name={`${tab.prefix}Footer`}
              rows={4}
            />
          </FieldGroup>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TemplateInput({
  form,
  label,
  name,
}: {
  form: OfficialDocumentSettingsFormApi;
  label: string;
  name: TemplateFieldName;
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <AppFormField inputId={field.name} label={label}>
          <Input
            id={field.name}
            maxLength={160}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            value={String(field.state.value)}
          />
        </AppFormField>
      )}
    </form.Field>
  );
}

function TemplateTextarea({
  form,
  label,
  name,
  rows,
}: {
  form: OfficialDocumentSettingsFormApi;
  label: string;
  name: TemplateFieldName;
  rows: number;
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <AppFormField inputId={field.name} label={label}>
          <Textarea
            id={field.name}
            maxLength={800}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            rows={rows}
            value={String(field.state.value)}
          />
        </AppFormField>
      )}
    </form.Field>
  );
}
