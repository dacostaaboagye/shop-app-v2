"use client";

import type {
  OfficialDocumentSettingsResponse,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { FloatingActionBar } from "@/components/system/floating-action-bar";
import { OfficialDocumentBusinessFields } from "./official-document-business-fields";
import { OfficialDocumentDocumentFields } from "./official-document-document-fields";
import {
  type EmailTemplateTabKey,
  OfficialDocumentEmailTemplateFields,
} from "./official-document-email-template-fields";
import { OfficialDocumentEmailTemplatePreview } from "./official-document-email-template-preview";
import {
  OfficialDocumentBrandFields,
  type OfficialDocumentSettingsFormApi,
} from "./official-document-identity-fields";
import { OfficialDocumentMoneyFields } from "./official-document-money-fields";
import { OfficialDocumentOverridePolicyFields } from "./official-document-override-policy-fields";
import { OfficialDocumentSettingsCard } from "./official-document-settings-card";
import {
  toOfficialDocumentSettingsFormValues,
  toOfficialDocumentSettingsPayload,
} from "./official-document-settings-form.support";
import { OfficialDocumentTemplatePreview } from "./official-document-template-preview";

export type OfficialDocumentSettingsSection =
  | "brand"
  | "business"
  | "documents"
  | "email"
  | "money"
  | "overrides";

type Props = {
  canManage: boolean;
  isSaving: boolean;
  onSubmit: (payload: UpdateOfficialDocumentSettingsRequest) => void;
  section: OfficialDocumentSettingsSection;
  settings: OfficialDocumentSettingsResponse;
};

export function OfficialDocumentSettingsForm({
  canManage,
  isSaving,
  onSubmit,
  section,
  settings,
}: Props) {
  const form = useForm({
    defaultValues: toOfficialDocumentSettingsFormValues(settings),
    onSubmit: async ({ value }) =>
      onSubmit(toOfficialDocumentSettingsPayload(value)),
  });
  const [activeEmailTemplate, setActiveEmailTemplate] =
    useState<EmailTemplateTabKey>("supplierInvite");
  const config = SETTINGS_SECTION_CONFIG[section];
  const settingsFields = (
    <div className="flex flex-col gap-4">
      <OfficialDocumentSettingsCard
        description={config.description}
        title={config.title}
      >
        {renderSection(section, form as OfficialDocumentSettingsFormApi, {
          activeEmailTemplate,
          setActiveEmailTemplate,
        })}
      </OfficialDocumentSettingsCard>
    </div>
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (canManage) void form.handleSubmit();
      }}
    >
      {section === "brand" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] xl:items-start">
          {settingsFields}
          <form.Subscribe selector={(state) => state.values}>
            {(values) => (
              <OfficialDocumentTemplatePreview
                logoImageUrl={settings.brand.logoImageUrl}
                values={values}
              />
            )}
          </form.Subscribe>
        </div>
      ) : section === "email" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-start">
          {settingsFields}
          <form.Subscribe selector={(state) => state.values}>
            {(values) => (
              <OfficialDocumentEmailTemplatePreview
                activeTemplate={activeEmailTemplate}
                logoImageUrl={settings.brand.logoImageUrl}
                values={values}
              />
            )}
          </form.Subscribe>
        </div>
      ) : (
        settingsFields
      )}

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isDirty: state.isDirty,
        })}
      >
        {({ isDirty }) => (
          <FloatingActionBar
            isSaving={isSaving}
            isVisible={isDirty}
            onReset={() => form.reset()}
            onSave={() => void form.handleSubmit()}
            saveLabel={config.saveLabel}
          />
        )}
      </form.Subscribe>
    </form>
  );
}

const SETTINGS_SECTION_CONFIG = {
  brand: {
    description:
      "Global brand identity applied across the portal, receipts, invoices, GTNs, and future PDFs.",
    saveLabel: "Save brand settings",
    title: "Brand identity",
  },
  business: {
    description:
      "Legal details for official documents and the support email used for replies and customer contact.",
    saveLabel: "Save business settings",
    title: "Business profile",
  },
  documents: {
    description:
      "Default document numbering, paper, timezone, locale, and footer behavior.",
    saveLabel: "Save document settings",
    title: "Document defaults",
  },
  email: {
    description:
      "Editable transactional email copy for account access and supplier portal invitations. Delivery sender comes from deployment email configuration, while the business support email is used for replies and support contact. Use {{firstName}} and {{supplierName}} where available.",
    saveLabel: "Save email templates",
    title: "Email templates",
  },
  money: {
    description:
      "Currency-safe defaults for sales now and ecommerce pricing later.",
    saveLabel: "Save money settings",
    title: "Money settings",
  },
  overrides: {
    description:
      "Controls which document fields location managers can override locally.",
    saveLabel: "Save override policy",
    title: "Location override policy",
  },
} satisfies Record<
  OfficialDocumentSettingsSection,
  { description: string; saveLabel: string; title: string }
>;

function renderSection(
  section: OfficialDocumentSettingsSection,
  form: OfficialDocumentSettingsFormApi,
  emailTemplateState: {
    activeEmailTemplate: EmailTemplateTabKey;
    setActiveEmailTemplate: (value: EmailTemplateTabKey) => void;
  },
) {
  switch (section) {
    case "brand":
      return <OfficialDocumentBrandFields form={form} />;
    case "business":
      return <OfficialDocumentBusinessFields form={form} />;
    case "documents":
      return <OfficialDocumentDocumentFields form={form} />;
    case "email":
      return (
        <OfficialDocumentEmailTemplateFields
          activeTemplate={emailTemplateState.activeEmailTemplate}
          form={form}
          onTemplateChange={emailTemplateState.setActiveEmailTemplate}
        />
      );
    case "money":
      return <OfficialDocumentMoneyFields form={form} />;
    case "overrides":
      return <OfficialDocumentOverridePolicyFields form={form} />;
  }
}
