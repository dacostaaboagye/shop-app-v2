"use client";

import { AppErrorBanner } from "@/components/system/app-error";

export function DocumentErrors({
  hasInvalidSnapshot,
  onRetry,
  snapshotError,
  snapshotIsError,
}: {
  hasInvalidSnapshot: boolean;
  onRetry: () => void;
  snapshotError: unknown;
  snapshotIsError: boolean;
}) {
  return (
    <>
      {snapshotIsError ? (
        <AppErrorBanner
          detail="Official document actions are unavailable until the issued snapshot can be loaded."
          error={snapshotError}
          onRetry={onRetry}
          title="Official document unavailable"
        />
      ) : null}
      {hasInvalidSnapshot ? (
        <AppErrorBanner
          detail="This issued document snapshot could not be read safely. Regenerate support action is required before printing or sharing."
          title="Official document snapshot is invalid"
        />
      ) : null}
    </>
  );
}
