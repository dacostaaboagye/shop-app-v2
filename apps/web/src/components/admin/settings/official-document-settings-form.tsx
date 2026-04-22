"use client";

import type {
  OfficialDocumentSettingsResponse,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfficialDocumentBusinessFields } from "./official-document-business-fields";
import { OfficialDocumentDocumentFields } from "./official-document-document-fields";
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
  const config = SETTINGS_SECTION_CONFIG[section];
  const settingsFields = (
    <div className="flex flex-col gap-4">
      <OfficialDocumentSettingsCard
        description={config.description}
        title={config.title}
      >
        {renderSection(section, form as OfficialDocumentSettingsFormApi)}
      </OfficialDocumentSettingsCard>

      <div className="flex justify-end">
        <Button disabled={!canManage || isSaving} type="submit">
          <Save data-icon="inline-start" />
          {isSaving ? "Saving..." : config.saveLabel}
        </Button>
      </div>
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
      ) : (
        settingsFields
      )}
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
      "Legal and contact details used on official business documents.",
    saveLabel: "Save business settings",
    title: "Business profile",
  },
  documents: {
    description:
      "Default document numbering, paper, timezone, locale, and footer behavior.",
    saveLabel: "Save document settings",
    title: "Document defaults",
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
) {
  switch (section) {
    case "brand":
      return <OfficialDocumentBrandFields form={form} />;
    case "business":
      return <OfficialDocumentBusinessFields form={form} />;
    case "documents":
      return <OfficialDocumentDocumentFields form={form} />;
    case "money":
      return <OfficialDocumentMoneyFields form={form} />;
    case "overrides":
      return <OfficialDocumentOverridePolicyFields form={form} />;
  }
}
