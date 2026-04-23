"use client";

import type { UpdateLocationDocumentSettingsRequest } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";
import { TimeZoneSelect } from "@/components/settings/document-setting-selects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type LocationDocumentSettingsFormValues,
  toLocationDocumentSettingsFormValues,
  toLocationDocumentSettingsPayload,
} from "./location-document-settings-form.support";

type Props = {
  isSaving: boolean;
  locationName: string;
  onSubmit: (payload: UpdateLocationDocumentSettingsRequest) => void;
  settings: Parameters<typeof toLocationDocumentSettingsFormValues>[0];
};

export function LocationDocumentSettingsForm({
  isSaving,
  locationName,
  onSubmit,
  settings,
}: Props) {
  const form = useForm({
    defaultValues: toLocationDocumentSettingsFormValues(settings),
    onSubmit: async ({ value }) =>
      onSubmit(toLocationDocumentSettingsPayload(value)),
  });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <Tabs className="w-full" defaultValue="location-profile">
        <TabsList className="h-12 mb-6">
          <TabsTrigger
            className="px-6 py-2 text-xs font-bold uppercase tracking-widest"
            value="location-profile"
          >
            Location profile
          </TabsTrigger>
          <TabsTrigger
            className="px-6 py-2 text-xs font-bold uppercase tracking-widest"
            value="receipt"
          >
            Receipt behavior
          </TabsTrigger>
        </TabsList>

        <TabsContent
          className="mt-0 focus-visible:outline-none"
          value="location-profile"
        >
          <div className="rounded-xl border border-border/50 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <h3 className="text-lg font-bold text-foreground">
                {locationName} profile overrides
              </h3>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Empty fields inherit the official admin configuration. Brand,
                legal, and currency settings remain platform controlled.
              </p>
            </div>

            <div className="grid gap-8">
              <form.Field name="displayName">
                {(field) => (
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor={field.name}
                      className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
                    >
                      Display name
                    </Label>
                    <Input
                      id={field.name}
                      className="h-11 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all font-medium"
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Inherit location name"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="addressLines">
                {(field) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={field.name}
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
                      >
                        Printed address
                      </Label>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
                        One line per printed address line
                      </span>
                    </div>
                    <Textarea
                      id={field.name}
                      className="min-h-[120px] rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all font-medium resize-none leading-relaxed"
                      maxLength={800}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Inherit business address"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              <div className="grid gap-8 sm:grid-cols-2">
                <form.Field name="phone">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor={field.name}
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
                      >
                        Printed phone
                      </Label>
                      <Input
                        id={field.name}
                        className="h-11 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all font-medium"
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Inherit business phone"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="email">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor={field.name}
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
                      >
                        Printed email
                      </Label>
                      <Input
                        id={field.name}
                        className="h-11 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all font-medium"
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Inherit business email"
                        type="email"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          className="mt-0 focus-visible:outline-none"
          value="receipt"
        >
          <div className="rounded-xl border border-border/50 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <h3 className="text-lg font-bold text-foreground">
                Receipt behavior
              </h3>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Configure branch-specific receipt copy and print format.
              </p>
            </div>

            <div className="grid gap-8">
              <div className="grid gap-8 sm:grid-cols-3">
                <form.Field name="documentPrefix">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor={field.name}
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
                      >
                        Number prefix
                      </Label>
                      <Input
                        id={field.name}
                        className="h-11 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all font-medium"
                        maxLength={20}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Inherit"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="defaultPaperSize">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor={field.name}
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
                      >
                        Paper size
                      </Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(
                            value as LocationDocumentSettingsFormValues["defaultPaperSize"],
                          )
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all">
                          <SelectValue placeholder="Select paper size" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 shadow-sm">
                          <SelectItem value="inherit">Inherit</SelectItem>
                          <SelectItem value="receipt_80mm">
                            80mm receipt
                          </SelectItem>
                          <SelectItem value="a4">A4 document</SelectItem>
                          <SelectItem value="letter">
                            Letter document
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </form.Field>
                <form.Field name="timezone">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor={field.name}
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
                      >
                        Timezone
                      </Label>
                      <TimeZoneSelect
                        allowInherit
                        id={field.name}
                        onChange={field.handleChange}
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="receiptFooter">
                {(field) => (
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor={field.name}
                      className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
                    >
                      Receipt footer
                    </Label>
                    <Textarea
                      id={field.name}
                      className="min-h-[100px] rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all font-medium resize-none leading-relaxed"
                      maxLength={500}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Inherit official footer"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button
          disabled={isSaving}
          type="submit"
          className="h-12 rounded-xl px-8 font-bold shadow-sm transition-all active:scale-[0.98]"
        >
          {isSaving ? (
            <div className="flex items-center gap-2">
              <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Saving...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="size-5" />
              Save location document settings
            </div>
          )}
        </Button>
      </div>
    </form>
  );
}
