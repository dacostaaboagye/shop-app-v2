import type {
  WorkerHandoverLane,
  WorkerHandoverLaneCounts,
  WorkerHandoverSummary,
} from "@shop/contracts";

export type HandoverLaneDefinition = {
  description: string;
  key: WorkerHandoverLane;
  label: string;
};

export const workerHandoverLanes: readonly HandoverLaneDefinition[] = [
  {
    description: "Stock temporarily sitting with you.",
    key: "active_received",
    label: "Received",
  },
  {
    description: "Stock you handed to another worker.",
    key: "active_given",
    label: "Given",
  },
  {
    description: "Handovers returned to the original worker.",
    key: "reverted",
    label: "Reverted",
  },
  {
    description: "Closed or older custody activity.",
    key: "history",
    label: "History",
  },
];

export function filterWorkerHandovers(input: {
  items: readonly WorkerHandoverSummary[];
  lane: WorkerHandoverLane;
  search: string;
}) {
  const query = input.search.trim().toLowerCase();
  const laneItems = input.items.filter((item) => item.lane === input.lane);

  if (!query) {
    return laneItems;
  }

  return laneItems.filter((item) =>
    [
      item.productName,
      item.variantName,
      item.sku,
      item.fromWorkerName,
      item.toWorkerName,
      item.currentWorkerName,
      item.locationName,
    ].some((value) => value.toLowerCase().includes(query)),
  );
}

export function emptyLaneCounts(): WorkerHandoverLaneCounts {
  return {
    active_given: 0,
    active_received: 0,
    history: 0,
    reverted: 0,
  };
}
