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
    <div className="mt-8 grid gap-4 rounded-md border border-border bg-muted/25 p-4 text-xs sm:grid-cols-[1fr_180px]">
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
      <div className="text-right">
        <p className="font-semibold uppercase text-foreground">
          Document evidence
        </p>
        <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
          sha256:preview-template-hash
        </p>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          official-document-v1
        </p>
      </div>
    </div>
  );
}
