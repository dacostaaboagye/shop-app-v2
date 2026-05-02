import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatFieldLabel } from "./change-log-meta";

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
    <div className="grid grid-cols-1 gap-2 rounded-md border border-border/60 bg-card/60 p-3 md:grid-cols-[8rem_1fr_1fr]">
      <dt className="type-data-label">{formatFieldLabel(field)}</dt>
      <dd className="flex flex-col gap-1">
        <span className="type-kicker text-muted-foreground">Before</span>
        <FieldValue tone="before" value={before} />
      </dd>
      <dd className="flex flex-col gap-1">
        <span className="type-kicker text-muted-foreground">After</span>
        <FieldValue tone="after" value={after} />
      </dd>
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
    return (
      <span
        className={cn(
          "type-data-value overflow-wrap-anywhere",
          tone === "before" ? "text-muted-foreground line-through" : null,
        )}
      >
        {String(value)}
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
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
