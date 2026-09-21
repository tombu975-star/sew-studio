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
  UsersRound,
  MessageSquare,
  GraduationCap,
} from "lucide-react";
import { useRole } from "@/stores/role";
import { useNav, type ViewKey } from "@/stores/nav";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  to: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** visible to staff users (non-owners, non-trainees). */
  staff: boolean;
  /** visible to trainees. */
  trainee: boolean;
};

const NAV: NavItem[] = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard, staff: true, trainee: true },
  { to: "customers", label: "Customers", icon: Users, staff: false, trainee: false },
  { to: "orders", label: "Orders", icon: ShoppingBag, staff: true, trainee: true },
  { to: "board", label: "Board", icon: LayoutGrid, staff: true, trainee: true },
  { to: "fittings", label: "Fittings", icon: CalendarDays, staff: true, trainee: false },
  { to: "quote", label: "Quotes", icon: Zap, staff: false, trainee: false },
  { to: "tasks", label: "Tasks", icon: CheckSquare, staff: true, trainee: true },
  { to: "style-assist", label: "Style Assist", icon: Sparkles, staff: false, trainee: false },
  { to: "progress", label: "Progress", icon: GraduationCap, staff: false, trainee: true },
  { to: "team", label: "Team", icon: UsersRound, staff: false, trainee: false },
  { to: "community", label: "Community", icon: MessageSquare, staff: true, trainee: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { studioName, isStaff, isTrainee } = useRole();
  const { view, go } = useNav();
  const { user, logout } = useAuth();

  // Scope: owners see everything; staff see their workbench subset; trainees see a focused learning subset.
  const items = NAV.filter((n) => {
    if (isTrainee()) return n.trainee;
    if (isStaff()) return n.staff;
    return true; // owner
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
          <div className="w-10 h-10 rounded-full border border-[#800020] flex items-center justify-center group-hover:bg-[#800020] group-hover:text-white text-[#800020] transition-all duration-300 elevate-sm">
            <Scissors className="w-4 h-4" />
          </div>
        </button>
        <nav className="flex-1 flex flex-col items-center gap-1 pt-2 overflow-y-auto scroll-slim w-full">
          {items.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <button
                key={to}
                onClick={() => go(to)}
                className="group relative flex flex-col items-center gap-1 w-16 py-2.5 rounded-lg transition-all duration-200"
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 bg-[#800020] rounded-r-full" />
                )}
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-8 rounded-lg transition-all duration-200",
                    active
                      ? "bg-[#800020]/8 text-[#800020]"
                      : "text-stone-400 group-hover:text-stone-700 group-hover:bg-[#faf8f5]"
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
                </div>
                <span
                  className={cn(
                    "text-[10px] tracking-wide transition-colors",
                    active ? "text-[#800020] font-semibold" : "text-stone-400 group-hover:text-stone-600"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Signed-in user + sign out */}
        <div className="pb-4 flex flex-col items-center gap-2 w-full px-2">
          {user && (
            <button
              onClick={() => logout()}
              className="relative group flex flex-col items-center gap-1.5"
              title={`${user.fullName} · Sign out`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] text-white flex items-center justify-center text-sm font-semibold elevate-sm group-hover:scale-105 transition-transform">
                {(user.fullName || user.email || "?").charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#15803D] border-2 border-white" />
              <span className="text-[9px] text-stone-400 group-hover:text-[#800020] transition-colors flex items-center gap-0.5">
                <LogOut className="w-2.5 h-2.5" />
                Sign out
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 border-b border-[#E7E5E4] bg-white/95 backdrop-blur-md">
        <button
          onClick={() => go("dashboard")}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-full border border-[#800020] flex items-center justify-center">
            <Scissors className="w-3.5 h-3.5 text-[#800020]" />
          </div>
          <span className="font-display text-lg font-semibold text-[#1C1917]">
            {studioName.split(" ")[0]}
          </span>
        </button>
        <div className="flex items-center gap-1.5">
          {user && (
            <button
              onClick={() => logout()}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] text-white flex items-center justify-center text-xs font-semibold"
              title={`${user.fullName} · Sign out`}
            >
              {(user.fullName || "?").charAt(0).toUpperCase()}
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 md:pl-20 pb-16 md:pb-0 flex flex-col">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around h-14 border-t border-[#E7E5E4] bg-white/95 backdrop-blur-md overflow-x-auto scroll-slim">
        {items.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <button
              key={to}
              onClick={() => go(to)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 shrink-0 relative"
            >
              {active && (
                <span className="absolute top-0 w-8 h-0.5 bg-[#800020] rounded-full" />
              )}
              <Icon
                className={cn("w-5 h-5 transition-colors", active ? "text-[#800020]" : "text-stone-400")}
                strokeWidth={active ? 2 : 1.5}
              />
              <span
                className={cn(
                  "text-[9px] transition-colors",
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
