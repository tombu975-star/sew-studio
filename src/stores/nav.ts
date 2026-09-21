"use client";

import { create } from "zustand";

export type ViewKey =
  | "dashboard"
  | "customers"
  | "customer"
  | "orders"
  | "order"
  | "new-order"
  | "board"
  | "fittings"
  | "tasks"
  | "style-assist"
  | "quote"
  | "team"
  | "community"
  | "progress"
  | "portfolio"
  | "certificate";

interface NavState {
  view: ViewKey;
  // optional context id (customer id, order id)
  selectedId: string | null;
  // optional extra params (e.g. prefill garment for new order)
  params: Record<string, string>;
  go: (view: ViewKey, opts?: { id?: string | null; params?: Record<string, string> }) => void;
}

export const useNav = create<NavState>((set) => ({
  view: "dashboard",
  selectedId: null,
  params: {},
  go: (view, opts) =>
    set({
      view,
      selectedId: opts?.id ?? null,
      params: opts?.params ?? {},
    }),
}));
