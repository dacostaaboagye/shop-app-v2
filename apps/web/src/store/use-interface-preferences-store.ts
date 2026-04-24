import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TableDensity = "comfortable" | "compact";

type InterfacePreferencesState = {
  setSidebarExpandedSections: (sections: string[]) => void;
  setTableDensity: (density: TableDensity) => void;
  sidebarExpandedSections: string[] | null;
  tableDensity: TableDensity;
};

export const useInterfacePreferencesStore = create<InterfacePreferencesState>()(
  persist(
    (set) => ({
      setSidebarExpandedSections: (sections) =>
        set({ sidebarExpandedSections: sections }),
      setTableDensity: (density) => set({ tableDensity: density }),
      sidebarExpandedSections: null,
      tableDensity: "comfortable",
    }),
    {
      name: "shop-interface-preferences",
    },
  ),
);
