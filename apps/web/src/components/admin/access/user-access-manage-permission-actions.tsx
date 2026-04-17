"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OVERRIDE_BADGE_CLASS_NAMES } from "@/lib/admin-models";
import type { PermissionState } from "./user-access-manage-support";

export function PermissionStateBadge({ state }: { state: PermissionState }) {
  if (state.kind === "role-grant") {
    return (
      <Badge className="text-[0.65rem]" variant="secondary">
        Via role
      </Badge>
    );
  }

  if (state.kind === "allow-override") {
    return (
      <Badge
        className={`${OVERRIDE_BADGE_CLASS_NAMES.allow} text-[0.65rem]`}
        variant="outline"
      >
        Allow override
      </Badge>
    );
  }

  if (state.kind === "deny-override") {
    return (
      <Badge
        className={`${OVERRIDE_BADGE_CLASS_NAMES.deny} text-[0.65rem]`}
        variant="outline"
      >
        Deny override
      </Badge>
    );
  }

  return (
    <Badge className="text-[0.65rem] text-muted-foreground" variant="outline">
      Not granted
    </Badge>
  );
}

export function PermissionActions({
  onAllow,
  onDeny,
  onRemoveOverride,
  state,
}: {
  onAllow: () => void;
  onDeny: () => void;
  onRemoveOverride?: (() => void) | undefined;
  state: PermissionState;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      {state.kind === "not-granted" ? (
        <Button onClick={onAllow} size="sm" type="button" variant="outline">
          Allow
        </Button>
      ) : state.kind === "role-grant" ? (
        <Button onClick={onDeny} size="sm" type="button" variant="outline">
          Deny
        </Button>
      ) : state.kind === "allow-override" ? (
        <>
          {onRemoveOverride ? (
            <Button
              onClick={onRemoveOverride}
              size="sm"
              type="button"
              variant="outline"
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : null}
          <Button onClick={onDeny} size="sm" type="button" variant="outline">
            Deny instead
          </Button>
        </>
      ) : (
        <>
          {onRemoveOverride ? (
            <Button
              onClick={onRemoveOverride}
              size="sm"
              type="button"
              variant="outline"
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : null}
          <Button onClick={onAllow} size="sm" type="button" variant="outline">
            Allow instead
          </Button>
        </>
      )}
    </div>
  );
}
