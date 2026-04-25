import type { OfficialDocumentSettingsFormValues } from "./official-document-settings-form.support";
import { textOrPlaceholder } from "./official-document-template-preview.parts";

export function OfficialDocumentTemplateFooter({
  addressLines,
  values,
}: {
  addressLines: string[];
  values: OfficialDocumentSettingsFormValues;
}) {
  return (
    <div className="mt-8 rounded-md border border-border bg-muted/25 p-4 text-xs">
      <div className="border-l-4 border-[var(--document-accent)] pl-3">
        <p className="font-semibold text-foreground">
          {textOrPlaceholder(values.receiptFooter, "Receipt footer")}
        </p>
        <p className="mt-3 text-muted-foreground">
          {textOrPlaceholder(values.phone, "Phone")} {" - "}
          {textOrPlaceholder(values.email, "Email")} {" - "}
          {textOrPlaceholder(values.website, "Website")}
        </p>
        <p className="mt-1 text-muted-foreground">
          {textOrPlaceholder(values.legalName, "Legal business name")}{" "}
          {addressLines.length ? `- ${addressLines.join(", ")}` : ""}
        </p>
      </div>
    </div>
  );
}
