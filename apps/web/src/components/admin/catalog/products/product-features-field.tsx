"use client";

import type { ValidationError } from "@tanstack/react-form";
import { Plus, X } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldLike = {
  handleChange: (values: string[]) => void;
  name: string;
  state: { meta: { errors: ValidationError[] }; value: string[] };
};

type Props = { field: FieldLike; showErrors: boolean };

export function FeaturesField({ field, showErrors }: Props) {
  return (
    <AppFormField
      errors={field.state.meta.errors}
      inputId={field.name}
      label="Features"
      showErrors={showErrors}
    >
      <div className="flex flex-col gap-2">
        {field.state.value.map((feat, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: ordered editable list, no stable IDs
          <div key={i} className="flex gap-2">
            <Input
              maxLength={500}
              onChange={(e) => {
                const next = [...field.state.value];
                next[i] = e.target.value;
                field.handleChange(next);
              }}
              placeholder={`Feature ${i + 1}`}
              value={feat}
            />
            <Button
              className="shrink-0"
              onClick={() =>
                field.handleChange(field.state.value.filter((_, j) => j !== i))
              }
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          className="self-start"
          onClick={() => field.handleChange([...field.state.value, ""])}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus data-icon="inline-start" />
          Add feature
        </Button>
      </div>
    </AppFormField>
  );
}
