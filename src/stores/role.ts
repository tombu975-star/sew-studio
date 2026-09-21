"use client";

import { create } from "zustand";

export type Role = "madam" | "staff" | "trainer" | "trainee" | "freelancer";
export type Mode = "business" | "training";

const ROLE_MODE: Record<Role, Mode> = {
  madam: "business",
  staff: "business",
  trainer: "training",
  trainee: "training",
  freelancer: "business",
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
  isOwner: () => boolean;
  isStaff: () => boolean;
  isTrainer: () => boolean;
  isTrainee: () => boolean;
  isFreelancer: () => boolean;
  /** can see sensitive business/financial info (owner + trainer) */
  canSeeBusiness: () => boolean;
  /** can create orders (owner only — trainees work on assigned tasks) */
  canCreateOrders: () => boolean;
  /** can see all customers (owner + trainer); staff/trainees see only their assigned */
  canSeeAllCustomers: () => boolean;
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
  isOwner: () => get().role === "madam",
  isStaff: () => get().role === "staff" || get().role === "trainee",
  isTrainer: () => get().role === "trainer",
  isTrainee: () => get().role === "trainee",
  isFreelancer: () => get().role === "freelancer",
  canSeeBusiness: () => get().role === "madam" || get().role === "trainer",
  canCreateOrders: () => get().role === "madam",
  canSeeAllCustomers: () => get().role === "madam" || get().role === "trainer",
}));
