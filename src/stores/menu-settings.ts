"use client";

import { create } from "zustand";
import { apiGet } from "@/lib/api";
import type { MenuKey } from "@/lib/menu-config";

type MenuSettingsState = {
  enabled: Partial<Record<MenuKey, boolean>> | null;
  error: string | null;
  load: () => Promise<void>;
};

export const useMenuSettings = create<MenuSettingsState>((set) => ({
  enabled: null,
  error: null,
  load: async () => {
    try {
      const settings = await apiGet<Partial<Record<MenuKey, boolean>>>("/api/menu-settings");
      set({ enabled: settings, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Could not load menu settings.",
      });
    }
  },
}));
