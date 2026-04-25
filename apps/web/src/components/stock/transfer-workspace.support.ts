import type { StockSupplyRequestResponse } from "@shop/contracts";
import { formatDateTime, formatPublicReference } from "@/lib/display/format";

export type TransferLane = {
  description: string;
  key: string;
  label: string;
  matches: (item: StockSupplyRequestResponse) => boolean;
};

export const managerTransferLanes: readonly TransferLane[] = [
  {
    description: "Requests waiting for review and quantity confirmation.",
    key: "needs_review",
    label: "Needs review",
    matches: (item) => item.status === "pending",
  },
  {
    description: "Approved transfers with stock reserved at source.",
    key: "reserved",
    label: "Reserved",
    matches: (item) =>
      item.status === "approved" && item.sourceReservationStatus === "active",
  },
  {
    description: "Dispatched transfers moving between locations.",
    key: "in_transit",
    label: "In transit",
    matches: (item) => item.status === "dispatched",
  },
  {
    description: "Received, rejected, or cancelled transfers.",
    key: "completed",
    label: "Completed",
    matches: (item) =>
      item.status === "received" ||
      item.status === "rejected" ||
      item.status === "cancelled",
  },
];

export const workerTransferLanes: readonly TransferLane[] = [
  {
    description: "Requests still moving through review or source allocation.",
    key: "open",
    label: "Open",
    matches: (item) => item.status === "pending" || item.status === "approved",
  },
  {
    description: "Approved transfers already on the way to your location.",
    key: "in_transit",
    label: "In transit",
    matches: (item) => item.status === "dispatched",
  },
  {
    description: "Transfers that were received, rejected, or cancelled.",
    key: "completed",
    label: "Completed",
    matches: (item) =>
      item.status === "received" ||
      item.status === "rejected" ||
      item.status === "cancelled",
  },
];

export const adminTransferLanes: readonly TransferLane[] = [
  {
    description: "Transfers still waiting for a source-location decision.",
    key: "needs_review",
    label: "Needs review",
    matches: (item) => item.status === "pending",
  },
  {
    description: "Approved transfers that are reserved and waiting to move.",
    key: "bottlenecks",
    label: "Bottlenecks",
    matches: (item) =>
      item.status === "approved" &&
      (item.sourceReservationStatus === "active" ||
        item.sourceReservationStatus === "confirmed"),
  },
  {
    description: "Transfers currently moving between locations.",
    key: "in_transit",
    label: "In transit",
    matches: (item) => item.status === "dispatched",
  },
  {
    description: "Rejected, cancelled, or structurally inconsistent transfers.",
    key: "exceptions",
    label: "Exceptions",
    matches: (item) =>
      item.status === "rejected" ||
      item.status === "cancelled" ||
      (item.status === "approved" &&
        item.sourceReservationStatus !== "active" &&
        item.sourceReservationStatus !== "confirmed"),
  },
  {
    description: "Transfers already confirmed at the destination.",
    key: "completed",
    label: "Completed",
    matches: (item) => item.status === "received",
  },
];

export function filterTransfers(
  items: readonly StockSupplyRequestResponse[],
  lanes: readonly TransferLane[],
  laneKey: string,
  search: string,
) {
  const lane = lanes.find((candidate) => candidate.key === laneKey) ?? lanes[0];
  const laneItems = lane
    ? items.filter((item) => lane.matches(item))
    : [...items];
  const query = search.trim().toLowerCase();

  if (!query) {
    return laneItems;
  }

  return laneItems.filter((item) =>
    [
      formatPublicReference(item.reference, ""),
      formatPublicReference(item.transferReference, ""),
      formatPublicReference(item.gtnReference, ""),
      item.skuSnapshot.productName,
      item.skuSnapshot.variantName,
      item.locationName,
      item.sourceLocationName,
      item.requesterName,
      item.requesterEmail,
    ].some((value) => value?.toLowerCase().includes(query)),
  );
}

export function getLaneCounts(
  items: readonly StockSupplyRequestResponse[],
  lanes: readonly TransferLane[],
) {
  return Object.fromEntries(
    lanes.map((lane) => [
      lane.key,
      items.filter((item) => lane.matches(item)).length,
    ]),
  );
}

export function countAgeingTransfers(
  items: readonly StockSupplyRequestResponse[],
  now = new Date(),
) {
  return items.filter(
    (item) =>
      !isClosedTransfer(item) && hoursBetween(item.createdAt, now) >= 24,
  ).length;
}

export function buildTransferTimeline(item: StockSupplyRequestResponse) {
  return [
    {
      label: "Requested",
      value: formatDateTime(item.createdAt),
    },
    {
      label: "Reserved",
      value:
        item.sourceReservationStatus === "active" ||
        item.sourceReservationStatus === "confirmed"
          ? item.sourceReservationStatus === "confirmed"
            ? "Consumed on dispatch"
            : "Reserved at source"
          : "Not reserved",
    },
    {
      label: "Dispatched",
      value: item.dispatchedAt
        ? formatDateTime(item.dispatchedAt)
        : "Not dispatched",
    },
    {
      label: "Received",
      value: item.receivedAt
        ? formatDateTime(item.receivedAt)
        : "Awaiting receipt",
    },
  ];
}

function isClosedTransfer(item: StockSupplyRequestResponse) {
  return (
    item.status === "received" ||
    item.status === "rejected" ||
    item.status === "cancelled"
  );
}

function hoursBetween(value: string, now: Date) {
  return (now.getTime() - new Date(value).getTime()) / (1000 * 60 * 60);
}
