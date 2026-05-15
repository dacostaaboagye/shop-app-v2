import type {
  ManagerHandoverLane,
  ManagerHandoverLaneCounts,
  ManagerHandoverSummary,
} from "@shop/contracts";

export type ManagerHandoverLaneDefinition = {
  description: string;
  key: ManagerHandoverLane;
  label: string;
};

export const managerHandoverLanes: readonly ManagerHandoverLaneDefinition[] = [
  {
    description: "Custody is currently away from the original worker.",
    key: "active",
    label: "Active",
  },
  {
    description: "Returned to the worker who originally held the stock.",
    key: "reverted",
    label: "Reverted",
  },
  {
    description: "Older or closed custody activity.",
    key: "history",
    label: "History",
  },
];

export function filterManagerHandovers(input: {
  items: readonly ManagerHandoverSummary[];
  lane: ManagerHandoverLane;
}) {
  return input.items.filter((item) => item.lane === input.lane);
}

export function emptyManagerHandoverLaneCounts(): ManagerHandoverLaneCounts {
  return {
    active: 0,
    history: 0,
    reverted: 0,
  };
}

export function formatManagerHandoverStatus(item: ManagerHandoverSummary) {
  switch (item.lane) {
    case "active":
      return "Active";
    case "reverted":
      return "Reverted";
    case "history":
      return "History";
  }
}
