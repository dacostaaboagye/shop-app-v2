"use client";

import type { UpdateLocationDocumentSettingsRequest } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  toLocationDocumentSettingsFormValues,
  toLocationDocumentSettingsPayload,
} from "./location-document-settings-form.support";
import {
  LocationProfileFields,
  ReceiptBehaviorFields,
} from "./location-document-settings-form-fields";
import { SettingsTabSection } from "./location-document-settings-form-sections";

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
          <SettingsTabSection
            description="Empty fields inherit the official admin configuration. Brand, legal, and currency settings remain platform controlled."
            title={`${locationName} profile overrides`}
          >
            <LocationProfileFields form={form} />
          </SettingsTabSection>
        </TabsContent>

        <TabsContent
          className="mt-0 focus-visible:outline-none"
          value="receipt"
        >
          <SettingsTabSection
            description="Configure branch-specific receipt copy and print format."
            title="Receipt behavior"
          >
            <ReceiptBehaviorFields form={form} />
          </SettingsTabSection>
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
