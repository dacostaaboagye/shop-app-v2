"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  isPending: boolean;
  name: string;
  onCancel: () => void;
  onNameChange: (v: string) => void;
  onSubmit: () => void;
  onValuesChange: (v: string) => void;
  values: string;
};

export function AddOptionForm({
  isPending,
  name,
  onCancel,
  onNameChange,
  onSubmit,
  onValuesChange,
  values,
}: Props) {
  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <p className="mb-3 text-sm font-medium">New option</p>
      <div className="flex flex-col gap-2">
        <Input
          maxLength={80}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Name (e.g. Size)"
          value={name}
        />
        <Input
          maxLength={500}
          onChange={(e) => onValuesChange(e.target.value)}
          placeholder="Values, comma-separated (e.g. S, M, L)"
          value={values}
        />
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} size="sm" type="button" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !values.trim() || isPending}
            onClick={onSubmit}
            size="sm"
            type="button"
          >
            {isPending ? "Adding…" : "Add option"}
          </Button>
        </div>
      </div>
    </div>
  );
}
