"use client";

import { Search, X } from "lucide-react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  NotificationFilterOption,
  NotificationFilters,
  NotificationStatusFilter,
} from "./notification-center-page-client.support";

type NotificationCenterFiltersProps = {
  eventOptions: NotificationFilterOption[];
  filters: NotificationFilters;
  hasActiveFilters: boolean;
  onClear: () => void;
  onEventTypeChange: (value: string) => void;
  onResourceKindChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: NotificationStatusFilter) => void;
  onDateRangeChange: (value: NotificationFilters["dateRange"]) => void;
  resourceOptions: NotificationFilterOption[];
};

export function NotificationCenterFilters({
  eventOptions,
  filters,
  hasActiveFilters,
  onClear,
  onDateRangeChange,
  onEventTypeChange,
  onResourceKindChange,
  onSearchChange,
  onStatusChange,
  resourceOptions,
}: NotificationCenterFiltersProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="grid gap-6 md:grid-cols-2">
          <AppFormField inputId="notification-search" label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="notification-search"
                className="pl-9"
                placeholder="Search updates, references, actors, or details"
                value={filters.search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </AppFormField>
          <AppFormField inputId="notification-status" label="Status">
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onStatusChange(value as NotificationStatusFilter)
              }
            >
              <SelectTrigger id="notification-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="unread">Needs Attention</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </AppFormField>
          <AppFormField inputId="notification-event-type" label="Event Type">
            <Select value={filters.eventType} onValueChange={onEventTypeChange}>
              <SelectTrigger id="notification-event-type">
                <SelectValue placeholder="All event types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All event types</SelectItem>
                {eventOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AppFormField>
          <AppFormField
            inputId="notification-resource-kind"
            label="Notification Area"
          >
            <Select
              value={filters.resourceKind}
              onValueChange={onResourceKindChange}
            >
              <SelectTrigger id="notification-resource-kind">
                <SelectValue placeholder="All areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All areas</SelectItem>
                {resourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AppFormField>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <AppFormField inputId="notification-date-range" label="Date Range">
            <DatePickerWithRange
              {...(filters.dateRange ? { date: filters.dateRange } : {})}
              id="notification-date-range"
              onSelect={onDateRangeChange}
              placeholder="Pick a date range"
            />
          </AppFormField>
          <div className="flex min-w-0 flex-wrap items-center gap-3 lg:justify-end">
            <Button
              disabled={!hasActiveFilters}
              onClick={onClear}
              type="button"
              variant="outline"
            >
              <X data-icon="inline-start" />
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
