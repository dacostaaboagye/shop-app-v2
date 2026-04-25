import { Lock, Unlock } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { FieldGroup } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { OfficialDocumentSettingsFormApi } from "./official-document-identity-fields";

const OVERRIDE_FIELDS = [
  {
    description:
      "Permit managers to set a custom display name for their specific location on documents.",
    label: "Location display name",
    name: "allowLocationDisplayName",
  },
  {
    description:
      "Permit managers to provide a specific branch address instead of the headquarters address.",
    label: "Location address",
    name: "allowLocationAddress",
  },
  {
    description:
      "Permit managers to list branch-specific phone numbers or emails on documents.",
    label: "Location contact details",
    name: "allowLocationContact",
  },
  {
    description:
      "Permit managers to customize the text footer for their specific location.",
    label: "Location footer",
    name: "allowLocationFooter",
  },
  {
    description:
      "Permit managers to choose their preferred paper size based on local printer hardware.",
    label: "Location paper size",
    name: "allowLocationPaperSize",
  },
  {
    description:
      "Permit managers to define their own numbering prefix for branch-specific sequencing.",
    label: "Location document prefix",
    name: "allowLocationNumberPrefix",
  },
] as const;

export function OfficialDocumentOverridePolicyFields({
  form,
}: {
  form: OfficialDocumentSettingsFormApi;
}) {
  return (
    <FieldGroup className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
      {OVERRIDE_FIELDS.map((item) => (
        <form.Field key={item.name} name={item.name}>
          {(field) => (
            <AppFormField
              description={item.description}
              inputId={field.name}
              label={item.label}
            >
              <div
                className={cn(
                  "mt-1.5 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all",
                  field.state.value
                    ? "border-primary/20 bg-primary/[0.04]"
                    : "border-border/60 bg-muted/30",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg transition-all",
                      field.state.value
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/60 text-muted-foreground",
                    )}
                  >
                    {field.state.value ? (
                      <Unlock className="size-4" />
                    ) : (
                      <Lock className="size-4" />
                    )}
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors",
                        field.state.value
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {field.state.value ? "Unlocked" : "Locked"}
                    </p>
                    <p className="type-support text-muted-foreground/80">
                      Policy status
                    </p>
                  </div>
                </div>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                />
              </div>
            </AppFormField>
          )}
        </form.Field>
      ))}
    </FieldGroup>
  );
}
