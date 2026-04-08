import {
  create,
  type StateCreator,
  type StoreApi,
  type UseBoundStore,
} from "zustand";

export function createUiStore<TState>(
  initializer: StateCreator<TState, [], []>,
): UseBoundStore<StoreApi<TState>> {
  return create(initializer);
}
