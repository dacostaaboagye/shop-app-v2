import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatFieldLabel, looksLikeUuid } from "./change-log-meta";

type Snapshot = Record<string, unknown> | null;

type FieldDiffProps = {
  before: Snapshot;
  after: Snapshot;
  changedFields: readonly string[];
};

export function FieldDiff({ before, after, changedFields }: FieldDiffProps) {
  if (changedFields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No field-level changes recorded.
      </p>
    );
  }

  return (
    <dl className="flex flex-col gap-3">
      {changedFields.map((field) => (
        <FieldDiffRow
          after={after?.[field]}
          before={before?.[field]}
          field={field}
          key={field}
        />
      ))}
    </dl>
  );
}

type FieldDiffRowProps = {
  after: unknown;
  before: unknown;
  field: string;
};

function FieldDiffRow({ after, before, field }: FieldDiffRowProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-4 shadow-sm">
      <dt className="flex flex-wrap items-center gap-2">
        <span className="type-data-label text-muted-foreground">
          Changed field
        </span>
        <span className="text-sm font-semibold text-foreground">
          {formatFieldLabel(field)}
        </span>
      </dt>
      <dd className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
        <FieldValueCard label="Before" tone="before" value={before} />
        <span className="hidden self-center rounded-full border border-border/60 bg-background px-2 py-1 text-xs font-semibold text-muted-foreground md:inline-flex">
          to
        </span>
        <FieldValueCard label="After" tone="after" value={after} />
      </dd>
    </div>
  );
}

type FieldValueCardProps = FieldValueProps & {
  label: "Before" | "After";
};

function FieldValueCard({ label, tone, value }: FieldValueCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-20 flex-col gap-2 rounded-md border border-border/50 p-3",
        tone === "after" ? "bg-primary/5" : "bg-muted/30",
      )}
    >
      <span className="type-kicker text-muted-foreground">{label}</span>
      <FieldValue tone={tone} value={value} />
    </div>
  );
}

type FieldValueProps = {
  tone: "before" | "after";
  value: unknown;
};

function FieldValue({ tone, value }: FieldValueProps) {
  if (value === null || value === undefined) {
    return <span className="text-sm italic text-muted-foreground">—</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge
        className={cn(
          "w-fit",
          value
            ? "bg-success/15 text-success border-0"
            : "bg-muted/50 text-muted-foreground border-0",
        )}
        variant="outline"
      >
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "string" || typeof value === "number") {
    if (typeof value === "string" && looksLikeUuid(value)) {
      return <LegacyUuidValue />;
    }

    return (
      <span
        className={cn(
          "type-data-value overflow-wrap-anywhere",
          tone === "before" ? "text-muted-foreground" : null,
        )}
      >
        {String(value)}
      </span>
    );
  }

  if (isUnsafeIdObject(value)) {
    return <LegacyUuidValue />;
  }

  if (hasDisplayName(value)) {
    return (
      <span
        className={cn(
          "type-data-value overflow-wrap-anywhere",
          tone === "before" ? "text-muted-foreground" : null,
        )}
      >
        {value.name}
      </span>
    );
  }

  // Arrays, plain objects, or anything else → render as compact JSON in pre.
  return (
    <pre className="overflow-x-auto rounded-sm bg-muted/40 p-2 font-mono text-xs text-foreground">
      {safeStringify(value)}
    </pre>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(sanitizeForJsonDisplay(value), null, 2);
  } catch {
    return String(value);
  }
}

function LegacyUuidValue() {
  return (
    <span className="flex flex-col gap-1 text-sm text-muted-foreground">
      <span className="italic">Name not captured</span>
      <span className="type-kicker">Older history row. ID hidden.</span>
    </span>
  );
}

function hasDisplayName(value: unknown): value is { name: string } {
  if (!value || typeof value !== "object") return false;
  if (!("name" in value)) return false;
  const candidate = value as { name: unknown };
  return typeof candidate.name === "string" && candidate.name.length > 0;
}

function isUnsafeIdObject(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (!("id" in value)) return false;
  const candidate = value as { id: unknown; name?: unknown };
  return (
    typeof candidate.id === "string" &&
    looksLikeUuid(candidate.id) &&
    !hasDisplayName(value)
  );
}

function sanitizeForJsonDisplay(value: unknown): unknown {
  if (typeof value === "string") {
    return looksLikeUuid(value) ? "ID hidden" : value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForJsonDisplay);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "id")
      .map(([key, nextValue]) => [key, sanitizeForJsonDisplay(nextValue)]),
  );
}
