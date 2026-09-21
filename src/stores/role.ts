"use client";

import { create } from "zustand";

export type Role = "madam" | "staff" | "trainer" | "trainee";
export type Mode = "business" | "training";

const ROLE_MODE: Record<Role, Mode> = {
  madam: "business",
  staff: "business",
  trainer: "training",
  trainee: "training",
};

interface RoleState {
  role: Role;
  ownerLabel: string;
  studioName: string;
  setRole: (r: Role) => void;
  setMode: (m: Mode) => void;
  setOwnerLabel: (s: string) => void;
  setStudioName: (s: string) => void;
  mode: () => Mode;
  isStaff: () => boolean;
  isTrainer: () => boolean;
  isTrainee: () => boolean;
}

const loadRole = (): Role => {
  if (typeof window === "undefined") return "madam";
  const saved = window.localStorage.getItem("ms_role");
  return (saved as Role) || "madam";
};

export const useRole = create<RoleState>((set, get) => ({
  role: loadRole(),
  ownerLabel: "Madam",
  studioName: "Madam Studio",
  setRole: (r) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ms_role", r);
      window.localStorage.setItem(`ms_role_${ROLE_MODE[r]}`, r);
    }
    set({ role: r });
  },
  setMode: (m) => {
    const current = ROLE_MODE[get().role];
    if (m === current) return;
    let next: Role = m === "business" ? "madam" : "trainer";
    if (typeof window !== "undefined") {
      const last = window.localStorage.getItem(`ms_role_${m}`);
      if (last) next = last as Role;
    }
    set({ role: next });
  },
  setOwnerLabel: (s) => set({ ownerLabel: s }),
  setStudioName: (s) => set({ studioName: s }),
  mode: () => ROLE_MODE[get().role],
  isStaff: () => get().role === "staff" || get().role === "trainee",
  isTrainer: () => get().role === "trainer",
  isTrainee: () => get().role === "trainee",
}));
