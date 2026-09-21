"use client";

import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  CheckSquare,
  Scissors,
  LayoutGrid,
  CalendarDays,
  Zap,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useRole, type Role, type Mode } from "@/stores/role";
import { useNav, type ViewKey } from "@/stores/nav";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  to: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  staff: boolean;
  trainer: boolean;
  trainee: boolean;
};

const NAV: NavItem[] = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard, staff: true, trainer: true, trainee: true },
  { to: "customers", label: "Customers", icon: Users, staff: false, trainer: false, trainee: false },
  { to: "orders", label: "Orders", icon: ShoppingBag, staff: true, trainer: true, trainee: true },
  { to: "board", label: "Board", icon: LayoutGrid, staff: true, trainer: true, trainee: true },
  { to: "fittings", label: "Fittings", icon: CalendarDays, staff: true, trainer: true, trainee: true },
  { to: "quote", label: "Quotes", icon: Zap, staff: false, trainer: false, trainee: false },
  { to: "tasks", label: "Tasks", icon: CheckSquare, staff: true, trainer: true, trainee: true },
  { to: "style-assist", label: "Style Assist", icon: Sparkles, staff: false, trainer: false, trainee: false },
];

const MODE_ROLES: Record<Mode, [Role, string][]> = {
  business: [
    ["madam", "ownerLabel"],
    ["staff", "Staff"],
  ],
  training: [
    ["trainer", "Trainer"],
    ["trainee", "Trainee"],
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, setRole, setMode, ownerLabel, studioName, mode, isStaff } = useRole();
  const { view, selectedId, go } = useNav();
  const { user, logout } = useAuth();
  const currentMode = mode();
  const modeRoles = MODE_ROLES[currentMode].map(([r, label]) => [
    r,
    label === "ownerLabel" ? ownerLabel : label,
  ]) as [Role, string][];

  const items = NAV.filter((n) => {
    if (role === "trainer") return !!n.trainer;
    if (role === "trainee") return !!n.trainee;
    if (n.trainer) return role === "madam";
    if (n.trainee) return false;
    return !isStaff() || n.staff;
  });

  const isActive = (to: ViewKey) => {
    if (to === "dashboard") return view === "dashboard";
    if (to === "customers") return view === "customers" || view === "customer";
    if (to === "orders")
      return view === "orders" || view === "order" || view === "new-order";
    return view === to;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop rail */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center border-r border-[#E7E5E4] bg-white z-30">
        <button
          onClick={() => go("dashboard")}
          className="h-20 flex items-center justify-center group"
          aria-label="Go to dashboard"
        >
          <div className="w-10 h-10 rounded-full border border-[#800020] flex items-center justify-center group-hover:bg-[#800020]/5 transition">
            <Scissors className="w-4 h-4 text-[#800020]" />
          </div>
        </button>
        <nav className="flex-1 flex flex-col items-center gap-1 pt-2 overflow-y-auto scroll-slim w-full">
          {items.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <button
                key={to}
                onClick={() => go(to)}
                className="group flex flex-col items-center gap-1 w-16 py-2.5 rounded-md hover:bg-[#FBF9F7] transition"
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    active
                      ? "text-[#800020]"
                      : "text-stone-400 group-hover:text-stone-600"
                  )}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span
                  className={cn(
                    "text-[10px] tracking-wide",
                    active ? "text-[#800020] font-semibold" : "text-stone-400"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="pb-4 flex flex-col items-center gap-3">
          {/* Signed-in user + logout */}
          {user && (
            <div className="flex flex-col items-center gap-2 pb-3 border-b border-[#E7E5E4] w-16">
              <div className="w-9 h-9 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-xs font-semibold text-[#800020]">
                {(user.fullName || user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="text-center leading-tight">
                <p className="text-[10px] font-medium text-[#1C1917] truncate w-16">
                  {user.fullName.split(" ")[0]}
                </p>
                <p className="text-[8px] uppercase tracking-wide text-stone-400 mt-0.5">
                  {user.role}
                </p>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center justify-center w-8 h-8 rounded-md text-stone-400 hover:text-[#800020] hover:bg-[#800020]/5 transition"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] uppercase tracking-widest text-stone-400">
              Mode
            </span>
            <div className="flex flex-col gap-1 w-16">
              {(
                [
                  ["business", "Business"],
                  ["training", "Training"],
                ] as [Mode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "py-1 text-[8px] font-semibold uppercase tracking-wide rounded-md border transition",
                    currentMode === m
                      ? "bg-[#1C1917] text-white border-[#1C1917]"
                      : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] uppercase tracking-widest text-stone-400">
              View
            </span>
            {modeRoles.map(([r, label]) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  "w-16 py-1 text-[8px] font-semibold uppercase tracking-wide rounded-md border transition",
                  role === r
                    ? "bg-[#800020] text-white border-[#800020]"
                    : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex flex-col gap-1.5 px-4 py-2 border-b border-[#E7E5E4] bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            onClick={() => go("dashboard")}
            className="font-display text-xl font-semibold text-[#1C1917]"
          >
            {studioName.split(" ")[0]} Studio
          </button>
          <div className="flex items-center gap-1">
            {(
              [
                ["business", "Business"],
                ["training", "Training"],
              ] as [Mode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-2 py-1 text-[9px] font-semibold uppercase rounded border",
                  currentMode === m
                    ? "bg-[#1C1917] text-white border-[#1C1917]"
                    : "text-stone-400 border-stone-200"
                )}
              >
                {label}
              </button>
            ))}
            {user && (
              <button
                onClick={() => logout()}
                className="ml-1 flex items-center justify-center w-7 h-7 rounded text-stone-400 hover:text-[#800020] transition"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-stone-400">
            View
          </span>
          {modeRoles.map(([r, label]) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "px-1.5 py-1 text-[8px] font-semibold uppercase rounded border",
                role === r
                  ? "bg-[#800020] text-white border-[#800020]"
                  : "text-stone-400 border-stone-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 md:pl-20 pb-16 md:pb-0 flex flex-col">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around h-14 border-t border-[#E7E5E4] bg-white overflow-x-auto scroll-slim">
        {items.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <button
              key={to}
              onClick={() => go(to)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 shrink-0"
            >
              <Icon
                className={cn("w-5 h-5", active ? "text-[#800020]" : "text-stone-400")}
                strokeWidth={active ? 2 : 1.5}
              />
              <span
                className={cn(
                  "text-[9px]",
                  active ? "text-[#800020] font-semibold" : "text-stone-400"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
