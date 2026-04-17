"use client";

import type { AdminProductOption } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addAdminOptionValue,
  adminProductQueryKey,
  createAdminProductOption,
  deleteAdminOptionValue,
  deleteAdminProductOption,
} from "@/lib/react-query/admin-catalog-products";
import { toast } from "@/lib/toast";
import { AddOptionForm } from "./product-option-add-form";

type Props = {
  canManage: boolean;
  options: AdminProductOption[];
  productSlug: string;
};

export function ProductOptionsPanel({
  canManage,
  options,
  productSlug,
}: Props) {
  const queryClient = useQueryClient();
  const qKey = adminProductQueryKey(productSlug);

  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValues, setNewOptionValues] = useState("");
  const [addingOption, setAddingOption] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminProductOption(productSlug, {
        name: newOptionName.trim(),
        values: newOptionValues
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qKey });
      setNewOptionName("");
      setNewOptionValues("");
      setAddingOption(false);
      toast.success("Option added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (optionId: string) =>
      deleteAdminProductOption(productSlug, optionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qKey });
      toast.success("Option removed");
    },
  });

  const addValueMutation = useMutation({
    mutationFn: ({ optionId, value }: { optionId: string; value: string }) =>
      addAdminOptionValue(productSlug, optionId, { value }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qKey });
      toast.success("Value added");
    },
  });

  const deleteValueMutation = useMutation({
    mutationFn: ({
      optionId,
      valueId,
    }: {
      optionId: string;
      valueId: string;
    }) => deleteAdminOptionValue(productSlug, optionId, valueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qKey });
      toast.success("Value removed");
    },
  });

  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Options</CardTitle>
          <CardDescription>
            Define attributes like Size or Color to pre-fill variant names.
          </CardDescription>
        </div>
        {canManage && !addingOption ? (
          <Button onClick={() => setAddingOption(true)} size="sm" type="button">
            <Plus data-icon="inline-start" />
            Add option
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {createMutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to add option</AlertTitle>
            <AlertDescription>
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "An unexpected error occurred."}
            </AlertDescription>
          </Alert>
        ) : null}

        {options.map((option) => (
          <OptionRow
            key={option.optionId}
            canManage={canManage}
            option={option}
            onDelete={() => deleteMutation.mutate(option.optionId)}
            onAddValue={(value) =>
              addValueMutation.mutate({ optionId: option.optionId, value })
            }
            onDeleteValue={(valueId) =>
              deleteValueMutation.mutate({ optionId: option.optionId, valueId })
            }
          />
        ))}

        {options.length === 0 && !addingOption ? (
          <p className="text-sm text-muted-foreground">
            No options defined. Options let you generate variant names from
            selections.
          </p>
        ) : null}

        {addingOption ? (
          <AddOptionForm
            name={newOptionName}
            values={newOptionValues}
            isPending={createMutation.isPending}
            onNameChange={setNewOptionName}
            onValuesChange={setNewOptionValues}
            onCancel={() => {
              setAddingOption(false);
              setNewOptionName("");
              setNewOptionValues("");
            }}
            onSubmit={() => createMutation.mutate()}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function OptionRow({
  canManage,
  onAddValue,
  onDelete,
  onDeleteValue,
  option,
}: {
  canManage: boolean;
  onAddValue: (value: string) => void;
  onDelete: () => void;
  onDeleteValue: (valueId: string) => void;
  option: AdminProductOption;
}) {
  const [newValue, setNewValue] = useState("");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{option.name}</p>
        {canManage ? (
          <Button
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {option.values.map((v) => (
          <Badge key={v.valueId} className="gap-1 pr-1" variant="secondary">
            {v.value}
            {canManage ? (
              <button
                className="rounded-sm opacity-60 hover:opacity-100"
                onClick={() => onDeleteValue(v.valueId)}
                type="button"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </Badge>
        ))}
        {canManage ? (
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = newValue.trim();
              if (trimmed) {
                onAddValue(trimmed);
                setNewValue("");
              }
            }}
          >
            <Input
              className="h-6 w-20 text-xs"
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="+ value"
              value={newValue}
            />
          </form>
        ) : null}
      </div>
    </div>
  );
}
