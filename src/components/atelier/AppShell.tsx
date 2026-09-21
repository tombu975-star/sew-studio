"use client";

import { useState } from "react";
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
  Image as ImageIcon,
  Award,
  Send,
  Briefcase,
  ChevronRight,
  X,
  MoreHorizontal,
} from "lucide-react";
import { useRole, type Role } from "@/stores/role";
import { useNav, type ViewKey } from "@/stores/nav";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface NavItem {
  to: ViewKey;
  label: string;
  icon: IconType;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// ─── Role-scoped navigation ───────────────────────────────────────
// Each role sees a curated set of sections + items based on their privileges.

const SECTIONS: Record<Role, NavSection[]> = {
  // OWNER — full studio command center
  madam: [
    {
      label: "Overview",
      items: [{ to: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Studio",
      items: [
        { to: "orders", label: "Orders", icon: ShoppingBag },
        { to: "board", label: "Board", icon: LayoutGrid },
        { to: "fittings", label: "Fittings", icon: CalendarDays },
        { to: "tasks", label: "Tasks", icon: CheckSquare },
        { to: "quote", label: "Quotes", icon: Zap },
        { to: "style-assist", label: "Style Assist", icon: Sparkles },
      ],
    },
    {
      label: "Clients",
      items: [
        { to: "customers", label: "Customers", icon: Users },
        { to: "messages", label: "Messages", icon: Send },
      ],
    },
    {
      label: "People",
      items: [
        { to: "team", label: "Team", icon: UsersRound },
        { to: "community", label: "Community", icon: MessageSquare },
      ],
    },
    {
      label: "Learning",
      items: [
        { to: "progress", label: "Progress", icon: GraduationCap },
        { to: "portfolio", label: "Portfolio", icon: ImageIcon },
        { to: "certificate", label: "Certificates", icon: Award },
      ],
    },
  ],
  // TRAINER — manages trainees, sees production
  trainer: [
    {
      label: "Overview",
      items: [{ to: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Studio",
      items: [
        { to: "orders", label: "Orders", icon: ShoppingBag },
        { to: "board", label: "Board", icon: LayoutGrid },
        { to: "fittings", label: "Fittings", icon: CalendarDays },
      ],
    },
    {
      label: "People",
      items: [{ to: "community", label: "Community", icon: MessageSquare }],
    },
    {
      label: "Learning",
      items: [
        { to: "progress", label: "Trainee Progress", icon: GraduationCap },
        { to: "portfolio", label: "Portfolio", icon: ImageIcon },
      ],
    },
  ],
  // STAFF — works on assigned orders & tasks
  staff: [
    {
      label: "Overview",
      items: [{ to: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Studio",
      items: [
        { to: "orders", label: "Orders", icon: ShoppingBag },
        { to: "board", label: "Board", icon: LayoutGrid },
        { to: "fittings", label: "Fittings", icon: CalendarDays },
        { to: "tasks", label: "Tasks", icon: CheckSquare },
      ],
    },
    {
      label: "People",
      items: [{ to: "community", label: "Community", icon: MessageSquare }],
    },
    {
      label: "Work",
      items: [{ to: "portfolio", label: "Portfolio", icon: ImageIcon }],
    },
  ],
  // TRAINEE — focused learning journey
  trainee: [
    {
      label: "Overview",
      items: [{ to: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Studio",
      items: [
        { to: "orders", label: "Orders", icon: ShoppingBag },
        { to: "board", label: "Board", icon: LayoutGrid },
        { to: "tasks", label: "Tasks", icon: CheckSquare },
      ],
    },
    {
      label: "My Journey",
      items: [
        { to: "progress", label: "My Progress", icon: GraduationCap },
        { to: "portfolio", label: "Portfolio", icon: ImageIcon },
        { to: "certificate", label: "Certificate", icon: Award },
      ],
    },
    {
      label: "People",
      items: [{ to: "community", label: "Community", icon: MessageSquare }],
    },
  ],
  // FREELANCER — commissioned specialist
  freelancer: [
    {
      label: "Overview",
      items: [{ to: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Work",
      items: [{ to: "my-jobs", label: "My Jobs", icon: Briefcase }],
    },
    {
      label: "Showcase",
      items: [{ to: "portfolio", label: "Portfolio", icon: ImageIcon }],
    },
    {
      label: "People",
      items: [{ to: "community", label: "Community", icon: MessageSquare }],
    },
  ],
};

// Mobile: top 5 priority items per role (rest in a "More" sheet)
const MOBILE_PRIORITY: Record<Role, ViewKey[]> = {
  madam: ["dashboard", "orders", "customers", "messages", "community"],
  trainer: ["dashboard", "orders", "progress", "community", "board"],
  staff: ["dashboard", "orders", "board", "tasks", "community"],
  trainee: ["dashboard", "orders", "progress", "tasks", "community"],
  freelancer: ["dashboard", "my-jobs", "portfolio", "community", "orders"],
};

const ROLE_LABELS: Record<Role, string> = {
  madam: "Owner",
  staff: "Staff",
  trainer: "Trainer",
  trainee: "Trainee",
  freelancer: "Freelancer",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, studioName } = useRole();
  const { view, go } = useNav();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const shopDisplayName = user?.shop?.name || studioName;
  const sections = SECTIONS[role] || SECTIONS.staff;
  const allItems = sections.flatMap((s) => s.items);
  const priorityKeys = MOBILE_PRIORITY[role] || MOBILE_PRIORITY.staff;
  const mobileItems = priorityKeys
    .map((k) => allItems.find((i) => i.to === k))
    .filter(Boolean) as NavItem[];
  const moreItems = allItems.filter((i) => !priorityKeys.includes(i.to));

  const isActive = (to: ViewKey) => {
    if (to === "dashboard") return view === "dashboard";
    if (to === "customers") return view === "customers" || view === "customer";
    if (to === "orders")
      return view === "orders" || view === "order" || view === "new-order";
    return view === to;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ─── Desktop sidebar (w-60, sectioned) ───────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col border-r border-[#E7E5E4] bg-white z-30">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-[#E7E5E4] shrink-0">
          <button
            onClick={() => go("dashboard")}
            className="flex items-center gap-3 group w-full"
          >
            <div className="w-10 h-10 rounded-full border border-[#800020] flex items-center justify-center group-hover:bg-[#800020] group-hover:text-white text-[#800020] transition-all duration-300 elevate-sm shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-left">
              <p className="font-display text-base font-semibold text-[#1C1917] truncate leading-tight">
                {shopDisplayName}
              </p>
              <p className="text-[9px] uppercase tracking-[0.16em] text-stone-400 mt-0.5">
                {ROLE_LABELS[role]} portal
              </p>
            </div>
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto scroll-slim px-3 py-3">
          {sections.map((section, si) => (
            <div key={section.label} className={cn(si > 0 && "mt-5")}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400 px-3 mb-1.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to);
                  return (
                    <button
                      key={to}
                      onClick={() => go(to)}
                      className={cn(
                        "group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        active
                          ? "bg-[#800020]/8 text-[#800020] font-medium"
                          : "text-stone-500 hover:text-[#1C1917] hover:bg-[#faf8f5]"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#800020] rounded-r-full" />
                      )}
                      <Icon
                        className="w-[18px] h-[18px] shrink-0"
                        strokeWidth={active ? 2 : 1.5}
                      />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        {user && (
          <div className="px-3 py-3 border-t border-[#E7E5E4] shrink-0">
            <button
              onClick={() => logout()}
              className="group w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#faf8f5] transition-colors"
              title={`${user.fullName} · Sign out`}
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] text-white flex items-center justify-center text-xs font-semibold elevate-sm">
                  {(user.fullName || user.email || "?").charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#15803D] border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-[#1C1917] truncate">
                  {user.fullName}
                </p>
                <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5 group-hover:text-[#800020] transition-colors">
                  <LogOut className="w-2.5 h-2.5" />
                  Sign out
                </p>
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* ─── Mobile top bar ──────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 border-b border-[#E7E5E4] bg-white/95 backdrop-blur-md">
        <button
          onClick={() => go("dashboard")}
          className="flex items-center gap-2 min-w-0"
        >
          <div className="w-7 h-7 rounded-full border border-[#800020] flex items-center justify-center shrink-0">
            <Scissors className="w-3.5 h-3.5 text-[#800020]" />
          </div>
          <span
            className="font-display text-base font-semibold text-[#1C1917] truncate max-w-[160px]"
            title={shopDisplayName}
          >
            {shopDisplayName}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
            {ROLE_LABELS[role]}
          </span>
        </button>
        <button
          onClick={() => logout()}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] text-white flex items-center justify-center text-xs font-semibold shrink-0"
          title={`${user?.fullName} · Sign out`}
        >
          {(user?.fullName || "?").charAt(0).toUpperCase()}
        </button>
      </header>

      {/* ─── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 md:pl-60 pb-16 md:pb-0 flex flex-col min-w-0">
        {children}
      </main>

      {/* ─── Mobile bottom nav (5 priority + More) ───────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around h-14 border-t border-[#E7E5E4] bg-white/95 backdrop-blur-md">
        {mobileItems.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <button
              key={to}
              onClick={() => go(to)}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 shrink-0 relative min-w-0 flex-1 max-w-[64px]"
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
                  "text-[9px] transition-colors truncate w-full text-center",
                  active ? "text-[#800020] font-semibold" : "text-stone-400"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
        {moreItems.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 shrink-0 min-w-0 flex-1 max-w-[64px]"
          >
            <MoreHorizontal
              className={cn("w-5 h-5", moreOpen ? "text-[#800020]" : "text-stone-400")}
              strokeWidth={1.5}
            />
            <span className="text-[9px] text-stone-400">More</span>
          </button>
        )}
      </nav>

      {/* ─── Mobile "More" sheet ─────────────────────────────────── */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl border-t border-[#E7E5E4] max-h-[70vh] overflow-y-auto scroll-slim animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-[#E7E5E4]">
              <p className="font-display text-lg font-semibold text-[#1C1917]">
                More
              </p>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#faf8f5] flex items-center justify-center text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-3 py-3">
              {sections.map((section) => {
                const sectionMore = section.items.filter(
                  (i) => !priorityKeys.includes(i.to)
                );
                if (sectionMore.length === 0) return null;
                return (
                  <div key={section.label} className="mb-4">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400 px-3 mb-1.5">
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {sectionMore.map(({ to, label, icon: Icon }) => {
                        const active = isActive(to);
                        return (
                          <button
                            key={to}
                            onClick={() => {
                              go(to);
                              setMoreOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                              active
                                ? "bg-[#800020]/8 text-[#800020] font-medium"
                                : "text-stone-600 hover:bg-[#faf8f5]"
                            )}
                          >
                            <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            <span className="flex-1 text-left">{label}</span>
                            <ChevronRight className="w-4 h-4 text-stone-300" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
