"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Field, FieldLabel } from "./field";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerSimpleProps {
  date?: Date | undefined;
  onSelect?: (date: Date | undefined) => void;
  label?: string;
  id?: string;
  className?: string;
  placeholder?: string;
}

export function DatePickerSimple({
  date,
  onSelect,
  label,
  id = "date-picker",
  className,
  placeholder = "Pick a date",
}: DatePickerSimpleProps) {
  const content = (
    <Popover>
      <PopoverTrigger className="w-full" render={<span />}>
        <Button
          variant="outline"
          id={id}
          className={cn(
            "h-10 w-full justify-start rounded-xl border-border/60 bg-muted/20 px-3 text-left font-normal transition-all hover:bg-muted/30 focus:bg-background focus:ring-primary/20",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          {...(date ? { defaultMonth: date, selected: date } : {})}
          {...(onSelect ? { onSelect } : {})}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );

  if (!label) {
    return <div className={cn("w-full", className)}>{content}</div>;
  }

  return (
    <Field className={cn("w-full", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {content}
    </Field>
  );
}
