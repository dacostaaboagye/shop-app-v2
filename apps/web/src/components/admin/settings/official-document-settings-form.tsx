"use client";

import type {
  OfficialDocumentSettingsResponse,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import {
  CurrencySelect,
  TimeZoneSelect,
} from "@/components/settings/document-setting-selects";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { OfficialDocumentSettingsCard } from "./official-document-settings-card";
import {
  type OfficialDocumentSettingsFormValues,
  toOfficialDocumentSettingsFormValues,
  toOfficialDocumentSettingsPayload,
} from "./official-document-settings-form.support";

type Props = {
  isSaving: boolean;
  onSubmit: (payload: UpdateOfficialDocumentSettingsRequest) => void;
  settings: OfficialDocumentSettingsResponse;
};

export function OfficialDocumentSettingsForm({
  isSaving,
  onSubmit,
  settings,
}: Props) {
  const form = useForm({
    defaultValues: toOfficialDocumentSettingsFormValues(settings),
    onSubmit: async ({ value }) =>
      onSubmit(toOfficialDocumentSettingsPayload(value)),
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <Tabs className="w-full" defaultValue="identity">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="money">Money</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent className="flex flex-col gap-4" value="identity">
          <OfficialDocumentSettingsCard
            description="Global identity applied to receipts, invoices, GTNs, and future PDFs."
            title="Brand and legal identity"
          >
            <FieldGroup>
              <form.Field name="brandName">
                {(field) => (
                  <AppFormField inputId={field.name} label="Brand name">
                    <Input
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="logoText">
                {(field) => (
                  <AppFormField inputId={field.name} label="Logo mark">
                    <Input
                      id={field.name}
                      maxLength={8}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="legalName">
                {(field) => (
                  <AppFormField
                    inputId={field.name}
                    label="Legal business name"
                  >
                    <Input
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="taxNumber">
                {(field) => (
                  <AppFormField inputId={field.name} label="Tax number">
                    <Input
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
            </FieldGroup>
          </OfficialDocumentSettingsCard>
        </TabsContent>

        <TabsContent className="flex flex-col gap-4" value="money">
          <OfficialDocumentSettingsCard
            description="Currency-safe defaults for sales now and ecommerce later."
            title="Money and document defaults"
          >
            <FieldGroup>
              <form.Field name="baseCurrencyCode">
                {(field) => (
                  <AppFormField inputId={field.name} label="Base currency">
                    <CurrencySelect
                      id={field.name}
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="defaultDisplayCurrencyCode">
                {(field) => (
                  <AppFormField inputId={field.name} label="Display currency">
                    <CurrencySelect
                      id={field.name}
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="currencyScale">
                {(field) => (
                  <AppFormField inputId={field.name} label="Currency scale">
                    <Input
                      id={field.name}
                      max={4}
                      min={0}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(Number(event.target.value))
                      }
                      type="number"
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="defaultPaperSize">
                {(field) => (
                  <AppFormField inputId={field.name} label="Default paper size">
                    <Select
                      id={field.name}
                      onChange={(event) =>
                        field.handleChange(
                          event.target
                            .value as OfficialDocumentSettingsFormValues["defaultPaperSize"],
                        )
                      }
                      value={field.state.value}
                    >
                      <option value="receipt_80mm">80mm receipt</option>
                      <option value="a4">A4 document</option>
                      <option value="letter">Letter document</option>
                    </Select>
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="timezone">
                {(field) => (
                  <AppFormField inputId={field.name} label="Timezone">
                    <TimeZoneSelect
                      id={field.name}
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
            </FieldGroup>
          </OfficialDocumentSettingsCard>
        </TabsContent>

        <TabsContent className="flex flex-col gap-4" value="documents">
          <OfficialDocumentSettingsCard
            description="Appears on issued sales documents until location overrides are enabled."
            title="Official document footer"
          >
            <form.Field name="receiptFooter">
              {(field) => (
                <AppFormField inputId={field.name} label="Footer">
                  <Textarea
                    id={field.name}
                    maxLength={500}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    rows={3}
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
          </OfficialDocumentSettingsCard>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button disabled={isSaving} type="submit">
          <Save data-icon="inline-start" />
          {isSaving ? "Saving..." : "Save document settings"}
        </Button>
      </div>
    </form>
  );
}
