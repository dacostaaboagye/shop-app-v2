"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Field, FieldLabel } from "./field";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerWithRangeProps {
  date?: DateRange | undefined;
  onSelect?: (date: DateRange | undefined) => void;
  label?: string;
  id?: string;
  className?: string;
  placeholder?: string;
}

export function DatePickerWithRange({
  date,
  onSelect,
  label,
  id = "date-picker-range",
  className,
  placeholder = "Pick a date range",
}: DatePickerWithRangeProps) {
  const content = (
    <Popover>
      <PopoverTrigger
        className="w-full"
        render={<Button variant="outline" type="button" />}
      >
        <span
          id={id}
          className={cn(
            "inline-flex w-full items-center justify-start gap-2 px-0 text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-4 w-4 opacity-50" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "LLL dd, y")} -{" "}
                {format(date.to, "LLL dd, y")}
              </>
            ) : (
              format(date.from, "LLL dd, y")
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          {...(date?.from ? { defaultMonth: date.from } : {})}
          {...(date ? { selected: date } : {})}
          {...(onSelect ? { onSelect } : {})}
          numberOfMonths={2}
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
