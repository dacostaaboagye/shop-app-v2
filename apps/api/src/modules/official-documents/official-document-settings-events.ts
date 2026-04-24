import { randomUUID } from "node:crypto";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

export function createOfficialDocumentSettingsEvent(input: {
  actor: { userSlug: string };
  changedSections: readonly string[];
  locationId?: string;
  locationName?: string;
  occurredAt: Date;
  scope: "global" | "location";
}): PlatformEventRecord {
  const locationSummary =
    input.scope === "location" && input.locationName
      ? ` for ${input.locationName}`
      : "";

  return {
    actor: { userSlug: input.actor.userSlug },
    audience:
      input.scope === "location" && input.locationId
        ? [
            {
              kind: "permission",
              locationId: input.locationId,
              permission: "settings.location_documents.manage",
            },
            { kind: "permission", permission: "settings.documents.view" },
          ]
        : [{ kind: "permission", permission: "settings.documents.view" }],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: {
      changedSections: input.changedSections.join(", "),
      locationId: input.locationId ?? null,
      locationName: input.locationName ?? null,
      scope: input.scope,
    },
    resource: {
      kind: "official_document_settings",
      reference:
        input.scope === "location" && input.locationId
          ? input.locationId
          : "global",
    },
    summary: `Official document settings${locationSummary} updated: ${input.changedSections.join(", ")}.`,
    type:
      input.scope === "location"
        ? "documents.settings.location_updated"
        : "documents.settings.global_updated",
  };
}

export function getChangedSettingSections(
  patch: Record<string, unknown>,
): string[] {
  const sections = Object.keys(patch).sort((left, right) =>
    left.localeCompare(right),
  );

  return sections.length > 0 ? sections : ["settings"];
}
