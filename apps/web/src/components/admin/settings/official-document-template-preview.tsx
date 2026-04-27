import type { CSSProperties } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfficialDocumentGtnTemplatePreview } from "./official-document-gtn-template-preview";
import type { OfficialDocumentSettingsFormValues } from "./official-document-settings-form.support";
import { OfficialDocumentTemplateFooter } from "./official-document-template-footer";
import {
  DocumentBrandBlock,
  DocumentMetaRow,
  getAddressLines,
  PreviewRecipientBlock,
  PreviewTable,
  PreviewTotals,
  textOrPlaceholder,
} from "./official-document-template-preview.parts";
import {
  getPreviewReference,
  getPreviewStatus,
  isGoodsTransferTemplate,
  OFFICIAL_DOCUMENT_TEMPLATE_PREVIEWS,
  type OfficialDocumentTemplatePreviewKey,
} from "./official-document-template-preview.support";

type Props = {
  logoImageUrl: string | null;
  values: OfficialDocumentSettingsFormValues;
};

export function OfficialDocumentTemplatePreview({
  logoImageUrl,
  values,
}: Props) {
  const primaryColor = cssColor(values.primaryColor);
  const accentColor = cssColor(values.accentColor);
  const style = {
    "--document-accent": accentColor,
    "--document-primary": primaryColor,
  } as CSSProperties;

  return (
    <Card
      className="h-fit overflow-hidden border-border/70 bg-card shadow-none"
      style={style}
    >
      <CardHeader className="border-b border-border/60">
        <CardTitle>Document preview</CardTitle>
        <CardDescription>
          Review live brand and document defaults against receipt, invoice,
          credit note, and GTN layouts.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="sales_receipt">
          <PreviewToolbar />
          <div className="bg-muted/45 p-4 sm:p-6">
            {OFFICIAL_DOCUMENT_TEMPLATE_PREVIEWS.map((template) => (
              <TabsContent
                className="mt-0"
                key={template.key}
                value={template.key}
              >
                <DocumentPaper
                  accentColor={accentColor}
                  logoImageUrl={logoImageUrl}
                  primaryColor={primaryColor}
                  templateKey={template.key}
                  values={values}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PreviewToolbar() {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 bg-foreground px-4 py-3 text-background sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">Template preview</p>
        <p className="text-xs text-background/70">
          Brand, recipient, and layout preview
        </p>
      </div>
      <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-2 lg:grid-cols-4 sm:w-auto">
        {OFFICIAL_DOCUMENT_TEMPLATE_PREVIEWS.map((template) => (
          <TabsTrigger
            className="min-w-0 rounded-lg border border-background/15 bg-background/8 px-3 py-2 text-background/70 whitespace-normal data-active:bg-background data-active:text-foreground"
            key={template.key}
            value={template.key}
          >
            {template.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

function DocumentPaper({
  accentColor,
  logoImageUrl,
  primaryColor,
  templateKey,
  values,
}: {
  accentColor: string;
  logoImageUrl: string | null;
  primaryColor: string;
  templateKey: OfficialDocumentTemplatePreviewKey;
  values: OfficialDocumentSettingsFormValues;
}) {
  const addressLines = getAddressLines(values.addressLines);
  const template = OFFICIAL_DOCUMENT_TEMPLATE_PREVIEWS.find(
    (item) => item.key === templateKey,
  );
  const isGtn = isGoodsTransferTemplate(templateKey);

  return (
    <div className="mx-auto max-w-[780px] overflow-hidden rounded-md border border-border bg-background shadow-sm">
      <DocumentHero
        accentColor={accentColor}
        logoImageUrl={logoImageUrl}
        primaryColor={primaryColor}
        templateKey={templateKey}
        values={values}
      />
      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        {isGtn ? (
          <OfficialDocumentGtnTemplatePreview
            primaryColor={primaryColor}
            values={values}
          />
        ) : (
          <>
            <div className="grid gap-8 sm:grid-cols-[1fr_0.95fr]">
              <PreviewRecipientBlock templateKey={templateKey} />
              <dl className="grid gap-2 text-sm">
                <DocumentMetaRow
                  label="Document type"
                  value={template?.title ?? "Official document"}
                />
                <DocumentMetaRow
                  label="Reference no."
                  value={getPreviewReference(templateKey, values)}
                />
                <DocumentMetaRow label="Issue date" value="04/21/2026" />
                <DocumentMetaRow
                  label="Currency"
                  value={values.defaultDisplayCurrencyCode}
                />
              </dl>
            </div>
            <PreviewTable templateKey={templateKey} values={values} />
            <PreviewTotals templateKey={templateKey} values={values} />
          </>
        )}
        <OfficialDocumentTemplateFooter
          addressLines={addressLines}
          values={values}
        />
      </div>
    </div>
  );
}

function DocumentHero({
  accentColor,
  logoImageUrl,
  primaryColor,
  templateKey,
  values,
}: {
  accentColor: string;
  logoImageUrl: string | null;
  primaryColor: string;
  templateKey: OfficialDocumentTemplatePreviewKey;
  values: OfficialDocumentSettingsFormValues;
}) {
  const reference = getPreviewReference(templateKey, values);
  const status = getPreviewStatus(templateKey);
  const template = OFFICIAL_DOCUMENT_TEMPLATE_PREVIEWS.find(
    (item) => item.key === templateKey,
  );

  return (
    <div className="relative min-h-48 overflow-hidden border-b border-border bg-background px-6 py-8 sm:px-8">
      <div
        className="absolute inset-y-0 left-0 w-[58%]"
        style={{
          backgroundColor: primaryColor,
          clipPath: "polygon(0 0, 78% 0, 66% 76%, 0 100%)",
        }}
      />
      <div
        className="absolute left-[42%] top-0 h-[82%] w-[9%]"
        style={{
          backgroundColor: accentColor,
          clipPath: "polygon(32% 0, 100% 0, 68% 100%, 0 100%)",
        }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-6 pt-5">
        <div className="max-w-72 text-primary-foreground">
          <p className="font-mono text-2xl font-semibold">{reference}</p>
          <p className="mt-5 max-w-64 text-balance text-sm leading-6 text-primary-foreground/78">
            {template?.title ?? "Official Document"} template for live
            operational documents.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase text-primary-foreground/80">
            {status}
          </p>
          <div className="mt-9 flex items-center gap-2">
            <div className="h-1 w-24 rounded-full bg-primary-foreground/55" />
            <div className="h-1 w-8 rounded-full bg-primary-foreground/25" />
          </div>
        </div>
        <div className="ml-auto min-w-60 max-w-[45%] text-center">
          <DocumentBrandBlock
            logoImageUrl={logoImageUrl}
            primaryColor={primaryColor}
            values={values}
          />
          <p className="mt-5 text-sm font-semibold">
            {textOrPlaceholder(values.legalName, "Legal business name")}
          </p>
          <p className="text-xs text-muted-foreground">
            {values.locale} | {values.timezone}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            VAT: {textOrPlaceholder(values.taxNumber, "Tax number")}
          </p>
        </div>
      </div>
    </div>
  );
}

function cssColor(value: string) {
  return value.trim() || "currentColor";
}
