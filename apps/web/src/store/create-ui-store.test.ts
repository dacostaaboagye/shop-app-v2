import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createUiStore } from "./create-ui-store";

describe("createUiStore", () => {
  it("creates a Zustand store with the house factory", () => {
    const useCounterStore = createUiStore<{
      count: number;
      increment: () => void;
    }>((set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }));

    useCounterStore.getState().increment();

    assert.equal(useCounterStore.getState().count, 1);
  });
});
