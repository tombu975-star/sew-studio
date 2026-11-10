"use client";

import { create } from "zustand";
import { apiPost, apiGet, apiPatch } from "@/lib/api";
import { useRole, type Role } from "@/stores/role";
import { setStudioCurrency } from "@/lib/format";

export interface AuthShop {
  id: string;
  name: string;
  slug: string;
  currency: string;
  plan: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string; // madam | staff | trainer | trainee | freelancer
  gender?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  shopId: string;
  shop?: AuthShop | null;
  canAccessOrders?: boolean;
  canAccessBoard?: boolean;
  canManageFreelancers?: boolean;
  mustChangePassword?: boolean;
}

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  status: Status;
  hydrate: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  updateProfile: (patch: { fullName: string; phone: string | null; gender: string | null; avatarUrl?: string | null }) => Promise<AuthUser>;
  register: (data: {
    shopName: string;
    fullName: string;
    email: string;
    password: string;
    gender?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const genderToOwnerLabel = (gender?: string | null): string => {
  if (gender === "Male") return "Master";
  if (gender === "Female") return "Madam";
  return "Madam";
};

const syncRoleStore = (user: AuthUser) => {
  setStudioCurrency(user.shop?.currency);
  const roleStore = useRole.getState();
  roleStore.setOwnerLabel(genderToOwnerLabel(user.gender));
  if (user.shop?.name) roleStore.setStudioName(user.shop.name);
  const userRole = user.role as Role;
  if (["madam", "staff", "trainer", "trainee", "freelancer"].includes(userRole)) {
    roleStore.setRole(userRole);
  }
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  hydrate: async () => {
    try {
      const res = await apiGet<{ user: AuthUser | null }>("/api/auth/me");
      if (res.user) {
        set({ user: res.user, status: "authenticated" });
        syncRoleStore(res.user);
      } else {
        set({ user: null, status: "unauthenticated" });
      }
    } catch {
      set({ user: null, status: "unauthenticated" });
    }
  },
  login: async (email, password, rememberMe = false) => {
    const res = await apiPost<{ user: AuthUser }>("/api/auth/login", { email, password, rememberMe });
    set({ user: res.user, status: "authenticated" });
    syncRoleStore(res.user);
    return res.user;
  },
  updateProfile: async (patch) => {
    const res = await apiPatch<{ user: AuthUser }>("/api/auth/profile", patch);
    set({ user: res.user, status: "authenticated" });
    syncRoleStore(res.user);
    return res.user;
  },
  register: async (data) => {
    const res = await apiPost<{ user: AuthUser }>("/api/auth/register", data);
    set({ user: res.user, status: "authenticated" });
    syncRoleStore(res.user);
    return res.user;
  },
  logout: async () => {
    try {
      await apiPost("/api/auth/logout", {});
    } catch {
      // ignore network errors on logout
    }
    set({ user: null, status: "unauthenticated" });
  },
}));
