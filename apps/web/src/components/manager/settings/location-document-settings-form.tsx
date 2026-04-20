"use client";

import type { UpdateLocationDocumentSettingsRequest } from "@shop/contracts";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TimeZoneSelect } from "@/components/settings/document-setting-selects";
import {
  toLocationDocumentSettingsFormValues,
  toLocationDocumentSettingsPayload,
  type LocationDocumentSettingsFormValues,
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
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <Tabs className="w-full" defaultValue="location-profile">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="location-profile">Location profile</TabsTrigger>
          <TabsTrigger value="receipt">Receipt behavior</TabsTrigger>
        </TabsList>

        <TabsContent className="flex flex-col gap-4" value="location-profile">
      <Card>
        <CardHeader>
          <CardTitle>{locationName} document overrides</CardTitle>
          <CardDescription>
            Empty fields inherit the official admin configuration. Brand,
            legal, and currency settings remain platform controlled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <form.Field name="displayName">
              {(field) => (
                <AppFormField inputId={field.name} label="Display name">
                  <Input
                    id={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Inherit location name"
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
            <form.Field name="addressLines">
              {(field) => (
                <AppFormField
                  description="One line per printed address line."
                  inputId={field.name}
                  label="Printed address"
                >
                  <Textarea
                    id={field.name}
                    maxLength={800}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Inherit business address"
                    rows={4}
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="phone">
                {(field) => (
                  <AppFormField inputId={field.name} label="Printed phone">
                    <Input
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Inherit business phone"
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="email">
                {(field) => (
                  <AppFormField inputId={field.name} label="Printed email">
                    <Input
                      id={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Inherit business email"
                      type="email"
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent className="flex flex-col gap-4" value="receipt">
      <Card>
        <CardHeader>
          <CardTitle>Receipt behavior</CardTitle>
          <CardDescription>
            Configure branch-specific receipt copy and print format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-3">
              <form.Field name="documentPrefix">
                {(field) => (
                  <AppFormField inputId={field.name} label="Number prefix">
                    <Input
                      id={field.name}
                      maxLength={20}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Inherit"
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
              <form.Field name="defaultPaperSize">
                {(field) => (
                  <AppFormField inputId={field.name} label="Paper size">
                    <Select
                      id={field.name}
                      onChange={(event) =>
                        field.handleChange(
                          event.target.value as LocationDocumentSettingsFormValues["defaultPaperSize"],
                        )
                      }
                      value={field.state.value}
                    >
                      <option value="inherit">Inherit</option>
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
                      allowInherit
                      id={field.name}
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                  </AppFormField>
                )}
              </form.Field>
            </div>
            <form.Field name="receiptFooter">
              {(field) => (
                <AppFormField inputId={field.name} label="Receipt footer">
                  <Textarea
                    id={field.name}
                    maxLength={500}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Inherit official footer"
                    rows={3}
                    value={field.state.value}
                  />
                </AppFormField>
              )}
            </form.Field>
          </FieldGroup>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button disabled={isSaving} type="submit">
          <Save data-icon="inline-start" />
          {isSaving ? "Saving..." : "Save location document settings"}
        </Button>
      </div>
    </form>
  );
}
