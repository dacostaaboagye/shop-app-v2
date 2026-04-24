"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function SelectField(props: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{props.label}</Label>
      <Select onValueChange={props.onChange} value={props.value}>
        <SelectTrigger className="w-full">
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
    </div>
  );
}

export function TextField(props: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{props.label}</Label>
      <Input
        onChange={(event) => props.onChange(event.target.value)}
        type={props.type}
        value={props.value}
      />
    </div>
  );
}

export function NumberField(props: {
  label: string;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{props.label}</Label>
      <Input
        min={props.min ?? 1}
        onChange={(event) => props.onChange(Number(event.target.value))}
        type="number"
        value={props.value}
      />
    </div>
  );
}

export function TextAreaField(props: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{props.label}</Label>
      <Textarea
        onChange={(event) => props.onChange(event.target.value)}
        value={props.value}
      />
    </div>
  );
}

export function FileField(props: {
  accept: string;
  disabled: boolean;
  file: File | null;
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{props.label}</Label>
      <Input
        accept={props.accept}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
      {props.file ? (
        <p className="text-xs text-muted-foreground">{props.file.name}</p>
      ) : null}
    </div>
  );
}
