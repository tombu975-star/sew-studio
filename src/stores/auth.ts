"use client";

import { create } from "zustand";
import { apiPost, apiGet } from "@/lib/api";
import { useRole, type Role } from "@/stores/role";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string; // madam | staff | trainer | trainee
  gender?: string | null;
  phone?: string | null;
}

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  status: Status;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const genderToOwnerLabel = (gender?: string | null): string => {
  if (gender === "Male") return "Master";
  if (gender === "Female") return "Madam";
  return "Madam";
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  hydrate: async () => {
    try {
      const res = await apiGet<{ user: AuthUser | null }>("/api/auth/me");
      if (res.user) {
        set({ user: res.user, status: "authenticated" });
        // Sync role store to match the logged-in user.
        const roleStore = useRole.getState();
        roleStore.setOwnerLabel(genderToOwnerLabel(res.user.gender));
        // Only override the active role if the user's role matches the current mode,
        // otherwise keep the user's chosen role within their accessible modes.
        const userRole = res.user.role as Role;
        if (["madam", "staff", "trainer", "trainee"].includes(userRole)) {
          roleStore.setRole(userRole);
        }
      } else {
        set({ user: null, status: "unauthenticated" });
      }
    } catch {
      set({ user: null, status: "unauthenticated" });
    }
  },
  login: async (email, password) => {
    const res = await apiPost<{ user: AuthUser }>("/api/auth/login", { email, password });
    set({ user: res.user, status: "authenticated" });
    // Sync role store.
    const roleStore = useRole.getState();
    roleStore.setOwnerLabel(genderToOwnerLabel(res.user.gender));
    const userRole = res.user.role as Role;
    if (["madam", "staff", "trainer", "trainee"].includes(userRole)) {
      roleStore.setRole(userRole);
    }
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
