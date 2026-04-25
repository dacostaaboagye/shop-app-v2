"use client";

import { useId } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type BaseFieldProps = {
  description?: string;
  label: string;
};

type SelectFieldProps = BaseFieldProps & {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  value: string;
};

export function SelectField(props: SelectFieldProps) {
  const inputId = useId();

  return (
    <AppFormField
      description={props.description}
      inputId={inputId}
      label={props.label}
    >
      <Select onValueChange={props.onChange} value={props.value}>
        <SelectTrigger className="w-full" id={inputId}>
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </AppFormField>
  );
}

type TextFieldProps = BaseFieldProps & {
  inputMode?: React.ComponentProps<typeof Input>["inputMode"];
  onChange: (value: string) => void;
  placeholder?: string;
  type?: React.ComponentProps<typeof Input>["type"];
  value: string;
};

export function TextField(props: TextFieldProps) {
  const inputId = useId();

  return (
    <AppFormField
      description={props.description}
      inputId={inputId}
      label={props.label}
    >
      <Input
        id={inputId}
        inputMode={props.inputMode}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        type={props.type}
        value={props.value}
      />
    </AppFormField>
  );
}

type NumberFieldProps = BaseFieldProps & {
  min?: number;
  onChange: (value: number) => void;
  placeholder?: string;
  value: number;
};

export function NumberField(props: NumberFieldProps) {
  const inputId = useId();

  return (
    <AppFormField
      description={props.description}
      inputId={inputId}
      label={props.label}
    >
      <Input
        id={inputId}
        min={props.min ?? 1}
        onChange={(event) => props.onChange(Number(event.target.value))}
        placeholder={props.placeholder}
        type="number"
        value={props.value}
      />
    </AppFormField>
  );
}

type TextAreaFieldProps = BaseFieldProps & {
  minHeightClassName?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function TextAreaField(props: TextAreaFieldProps) {
  const inputId = useId();

  return (
    <AppFormField
      description={props.description}
      inputId={inputId}
      label={props.label}
    >
      <Textarea
        className={props.minHeightClassName ?? "min-h-20"}
        id={inputId}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        value={props.value}
      />
    </AppFormField>
  );
}

type SwitchFieldProps = BaseFieldProps & {
  onChange: (value: boolean) => void;
  value: boolean;
};

export function SwitchField(props: SwitchFieldProps) {
  const inputId = useId();

  return (
    <AppFormField
      description={props.description}
      inputId={inputId}
      label={props.label}
    >
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
        <Switch
          checked={props.value}
          id={inputId}
          onCheckedChange={props.onChange}
        />
        <span className="type-support text-foreground">Enabled</span>
      </div>
    </AppFormField>
  );
}

type FileFieldProps = BaseFieldProps & {
  accept: string;
  disabled: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
};

export function FileField(props: FileFieldProps) {
  const inputId = useId();

  return (
    <AppFormField
      description={props.description}
      inputId={inputId}
      label={props.label}
    >
      <Input
        accept={props.accept}
        disabled={props.disabled}
        id={inputId}
        onChange={(event) => props.onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
      {props.file ? (
        <p className="type-support overflow-wrap-anywhere">{props.file.name}</p>
      ) : null}
    </AppFormField>
  );
}
