"use client";

import { createUiStore } from "@/store/create-ui-store";

export type TableDensity = "comfortable" | "compact";

type InterfacePreferencesState = {
  setTableDensity: (density: TableDensity) => void;
  tableDensity: TableDensity;
};

export const useInterfacePreferencesStore =
  createUiStore<InterfacePreferencesState>((set) => ({
    setTableDensity: (density) => set({ tableDensity: density }),
    tableDensity: "comfortable",
  }));
