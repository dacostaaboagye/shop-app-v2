import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

type ActiveLocationState = {
  clearSelectedLocationSlug: () => void;
  selectedLocationSlug: string | null;
  setSelectedLocationSlug: (locationSlug: string | null) => void;
};

const memoryMap = new Map<string, string>();

const memoryStorage: StateStorage = {
  getItem: (name) => memoryMap.get(name) ?? null,
  removeItem: (name) => {
    memoryMap.delete(name);
  },
  setItem: (name, value) => {
    memoryMap.set(name, value);
  },
};

export function normalizeActiveLocationSlug(locationSlug: string | null) {
  const trimmed = locationSlug?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export const useActiveLocationStore = create<ActiveLocationState>()(
  persist(
    (set) => ({
      clearSelectedLocationSlug: () => set({ selectedLocationSlug: null }),
      selectedLocationSlug: null,
      setSelectedLocationSlug: (locationSlug) =>
        set({
          selectedLocationSlug: normalizeActiveLocationSlug(locationSlug),
        }),
    }),
    {
      name: "shop-active-location",
      storage: createJSONStorage(() => getActiveLocationStorage()),
    },
  ),
);

function getActiveLocationStorage(): StateStorage {
  if (typeof window !== "undefined") {
    try {
      const storage = window.localStorage;
      const probeKey = "shop-active-location-storage-probe";
      storage.setItem(probeKey, "1");
      storage.removeItem(probeKey);
      return storage;
    } catch {
      return memoryStorage;
    }
  }

  return memoryStorage;
}
