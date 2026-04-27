type TransferLike = {
  createdAt: string;
  sourceReservationStatus?: string | null;
  status: string;
};

export function getAdminTransferMetrics(
  items: readonly TransferLike[],
  now = new Date(),
) {
  const needsReviewCount = items.filter(
    (item) => item.status === "pending",
  ).length;
  const bottleneckCount = items.filter(
    (item) =>
      item.status === "approved" &&
      (item.sourceReservationStatus === "active" ||
        item.sourceReservationStatus === "confirmed"),
  ).length;
  const inTransitCount = items.filter(
    (item) => item.status === "dispatched",
  ).length;
  const exceptionCount = items.filter(
    (item) =>
      item.status === "rejected" ||
      item.status === "cancelled" ||
      (item.status === "approved" &&
        item.sourceReservationStatus !== "active" &&
        item.sourceReservationStatus !== "confirmed"),
  ).length;
  const ageingCount = items.filter(
    (item) =>
      !isClosedStatus(item.status) && hoursBetween(item.createdAt, now) >= 24,
  ).length;

  return {
    ageingCount,
    bottleneckCount,
    exceptionCount,
    inTransitCount,
    needsReviewCount,
  };
}

export function getOpenAdminTransfers<T extends TransferLike>(
  items: readonly T[],
  limit: number,
) {
  return items.filter((item) => !isClosedStatus(item.status)).slice(0, limit);
}

function isClosedStatus(status: string) {
  return (
    status === "received" || status === "rejected" || status === "cancelled"
  );
}

function hoursBetween(value: string, now: Date) {
  return (now.getTime() - new Date(value).getTime()) / (1000 * 60 * 60);
}
