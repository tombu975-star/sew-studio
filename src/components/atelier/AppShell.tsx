"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  CheckSquare,
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
  Menu,
  Settings as SettingsIcon,
  BookOpen,
  UserRound,
  AlertCircle,
  Crown,
  Clock3,
  Calculator,
  Radio,
  Wallet,
  Truck,
  Package,
  Contact,
  Wrench,
  LineChart,
  ChevronDown,
  Search,
  Store,
} from "lucide-react";
import { useRole, type Role } from "@/stores/role";
import { useNav, type ViewKey } from "@/stores/nav";
import { useAuth } from "@/stores/auth";
import { useMenuSettings } from "@/stores/menu-settings";
import { useRoleAccess } from "@/stores/role-access";
import { menuForView } from "@/lib/menu-config";
import { cn } from "@/lib/utils";
import { BrandLogo, BrandMark } from "@/components/atelier/BrandMark";
import { ForcePasswordChange } from "@/components/atelier/ForcePasswordChange";
import { getPlanEntitlements } from "@/lib/plans";
import { ExportButtons } from "@/components/atelier/ExportButtons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      items: [{ to: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { to: "about-studio", label: "About Our Studio", icon: Store }, { to: "studio-sop", label: "Studio SOPs", icon: BookOpen }],
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
        { to: "accra-runs", label: "Market Runs", icon: Truck },
        { to: "assets", label: "Inventory", icon: Package },
        { to: "contacts", label: "Contacts", icon: Contact },
        { to: "asset-register", label: "Asset Register", icon: Wrench },
      ],
    },
    {
      label: "Commerce",
      items: [{ to: "ready-to-wear", label: "Ready-to-Wear Shop", icon: Store }],
    },
    {
      label: "Money",
      items: [
        { to: "payments", label: "Payments", icon: Wallet },
        { to: "costing", label: "True Costing", icon: Calculator },
        { to: "projection", label: "Business Projection", icon: LineChart },
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
        { to: "curriculum", label: "Curriculum", icon: BookOpen },
        { to: "webinars", label: "Webinars & Training", icon: Radio },
        { to: "progress", label: "Progress", icon: GraduationCap },
        { to: "portfolio", label: "Portfolio", icon: ImageIcon },
        { to: "certificate", label: "Certificates", icon: Award },
      ],
    },
    {
      label: "Admin",
      items: [{ to: "settings", label: "Settings", icon: SettingsIcon }],
    },
  ],
  // TRAINER — manages trainees, sees production
  trainer: [
    {
      label: "Overview",
      items: [{ to: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { to: "about-studio", label: "About Our Studio", icon: Store }, { to: "studio-sop", label: "Studio SOPs", icon: BookOpen }],
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
      label: "Learning",
      items: [
        { to: "curriculum", label: "Curriculum", icon: BookOpen },
        { to: "webinars", label: "Webinars & Training", icon: Radio },
        { to: "progress", label: "Trainee Progress", icon: GraduationCap },
        { to: "portfolio", label: "Portfolio", icon: ImageIcon },
      ],
    },
  ],
  // STAFF — works on assigned orders & tasks
  staff: [
    {
      label: "Overview",
      items: [{ to: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { to: "about-studio", label: "About Our Studio", icon: Store }, { to: "studio-sop", label: "Studio SOPs", icon: BookOpen }],
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
      items: [
        { to: "portfolio", label: "Portfolio", icon: ImageIcon },
        { to: "webinars", label: "Webinars & Training", icon: Radio },
      ],
    },
  ],
  // TRAINEE — focused learning journey
  trainee: [
    {
      label: "Overview",
      items: [{ to: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { to: "about-studio", label: "About Our Studio", icon: Store }, { to: "studio-sop", label: "Studio SOPs", icon: BookOpen }],
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
        { to: "curriculum", label: "My Curriculum", icon: BookOpen },
        { to: "webinars", label: "Webinars & Training", icon: Radio },
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

// Short labels for the phone bottom bar so nothing is cut off.
const SHORT_LABEL: Partial<Record<ViewKey, string>> = {
  dashboard: "Home",
  "ready-to-wear": "Shop",
  customers: "Clients",
  "my-jobs": "Jobs",
  community: "Community",
  progress: "Progress",
};

// Mobile: top 5 priority items per role (rest in a "More" sheet)
const MOBILE_PRIORITY: Record<Role, ViewKey[]> = {
  // Owners start with the everyday four; every other tool is under "More".
  madam: ["dashboard", "customers", "orders", "ready-to-wear"],
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

// Role accent — a distinct hue per role (mirrors the product's role legend)
// used sparingly for the role chip + avatar ring, so at a glance you can
// tell whose seat you're sitting in without it fighting the gold brand
// accent used for every interactive/active state.
const ROLE_ACCENT: Record<Role, string> = {
  madam: "#800020",
  staff: "#0E7490", // teal — operations
  trainer: "#B87A64", // rose clay — training & assessment
  trainee: "#650019", // deep burgundy — learning & portfolio
  freelancer: "#794652", // wine — assigned jobs
};

// Page title + icon shown in the mobile header for every route — including
// ones reached by drilling in (order/customer detail) that aren't in the
// nav itself. Keeps the header meaningful ("Order Details") instead of
// static branding that never changes as you move through the app.
const VIEW_META: Record<ViewKey, { label: string; icon: IconType }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  customers: { label: "Customers", icon: Users },
  customer: { label: "Customer Profile", icon: UserRound },
  orders: { label: "Orders", icon: ShoppingBag },
  order: { label: "Order Details", icon: ShoppingBag },
  "new-order": { label: "New Order", icon: ShoppingBag },
  board: { label: "Production Board", icon: LayoutGrid },
  fittings: { label: "Fittings", icon: CalendarDays },
  tasks: { label: "Tasks", icon: CheckSquare },
  "style-assist": { label: "Style Assist", icon: Sparkles },
  quote: { label: "Quotes", icon: Zap },
  costing: { label: "True Costing", icon: Calculator },
  payments: { label: "Payments", icon: Wallet },
  projection: { label: "Business Projection", icon: LineChart },
  "accra-runs": { label: "Market Runs", icon: Truck },
  assets: { label: "Inventory", icon: Package },
  contacts: { label: "Contacts", icon: Contact },
  "asset-register": { label: "Asset Register", icon: Wrench },
  team: { label: "Team", icon: UsersRound },
  community: { label: "Community", icon: MessageSquare },
  progress: { label: "Trainee Progress", icon: GraduationCap },
  curriculum: { label: "Curriculum", icon: BookOpen },
  webinars: { label: "Webinars & Training", icon: Radio },
  portfolio: { label: "Portfolio", icon: ImageIcon },
  certificate: { label: "Certificate", icon: Award },
  messages: { label: "Messages", icon: Send },
  "my-jobs": { label: "My Jobs", icon: Briefcase },
  profile: { label: "My Profile", icon: UserRound },
  "ready-to-wear": { label: "Ready-to-Wear Shop", icon: Store },
  "about-studio": { label: "About Our Studio", icon: Store },
  "studio-sop": { label: "Studio SOPs", icon: BookOpen },
  settings: { label: "Settings", icon: SettingsIcon },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, studioName } = useRole();
  const { view, go } = useNav();
  const { user, logout } = useAuth();
  const { enabled, error: menuSettingsError, load: loadMenuSettings } = useMenuSettings();
  const [navSearch, setNavSearch] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreSearch, setMoreSearch] = useState("");
  const moreDialogRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!moreOpen) { setMoreSearch(""); return; }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = moreDialogRef.current;
    dialog?.focus({ preventScroll: true });
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []).filter(el => el.getClientRects().length > 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMoreOpen(false); return; }
      if (event.key !== "Tab") return;
      const elements = focusables();
      if (!elements.length) { event.preventDefault(); dialog?.focus(); return; }
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => { if (desktop.matches) setMoreOpen(false); };
    desktop.addEventListener("change", onResize);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", onResize);
      document.removeEventListener("keydown", onKeyDown);
      moreTriggerRef.current?.focus();
    };
  }, [moreOpen]);
  // Desktop sidebar: owners see the everyday tools first; the rest sit under
  // "More tools". Remembered per browser once the owner opens or closes it.
  const [toolsOpen, setToolsOpen] = useState(false);
  useEffect(() => {
    try {
      setToolsOpen(window.localStorage.getItem("sidebar-more-tools") === "open");
    } catch {
      /* storage unavailable: stay collapsed */
    }
  }, []);
  const toggleTools = () => {
    setToolsOpen((open) => {
      const next = !open;
      try {
        window.localStorage.setItem("sidebar-more-tools", next ? "open" : "closed");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    void loadMenuSettings();
  }, [loadMenuSettings]);

  // What a platform admin lets this role see and change (/admin/roles).
  const roleAccess = useRoleAccess((s) => s.data);
  const loadRoleAccess = useRoleAccess((s) => s.load);
  useEffect(() => {
    void loadRoleAccess();
  }, [loadRoleAccess]);

  const shopDisplayName = user?.shop?.name || studioName;
  const planAccess = user?.shop
    ? getPlanEntitlements(user.shop.plan, user.shop.trial_ends_at)
    : null;
  const roleAccent = ROLE_ACCENT[role] || ROLE_ACCENT.staff;
  const activeMeta = VIEW_META[view] || VIEW_META.dashboard;

  // Trainee access to Orders + Board is gated by trainer-granted permissions.
  // Default trainee sees only Tasks in the Studio section; permitted trainees see the granted items.
  const traineeStudioItems: NavItem[] = [{ to: "tasks", label: "Tasks", icon: CheckSquare }];
  if (user?.canAccessBoard) {
    traineeStudioItems.unshift({ to: "board", label: "Board", icon: LayoutGrid });
  }
  if (user?.canAccessOrders) {
    traineeStudioItems.unshift({ to: "orders", label: "Orders", icon: ShoppingBag });
  }

  // Build the effective sections for the current role.
  const baseSections = SECTIONS[role] || SECTIONS.staff;
  const roleSections: NavSection[] =
    role === "trainee"
      ? baseSections.map((s) =>
          s.label === "Studio" ? { ...s, items: traineeStudioItems } : s
        )
      : baseSections;
  const visibleSections = roleSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const key = menuForView(item.to);
        return !key || (enabled?.[key] !== false && roleAccess?.access[key]?.view !== false);
      }),
    }))
    .filter((section) => section.items.length > 0);
  // Tools an admin has explicitly opened up to this role, beyond its usual menu.
  const shownKeys = new Set(roleSections.flatMap((s) => s.items.map((i) => menuForView(i.to))));
  const grantedItems: NavItem[] = (roleAccess?.granted ?? [])
    .filter((k) => !shownKeys.has(k) && enabled?.[k] !== false && roleAccess?.access[k]?.view !== false && VIEW_META[k as ViewKey])
    .map((k) => ({ to: k as ViewKey, label: VIEW_META[k as ViewKey].label, icon: VIEW_META[k as ViewKey].icon }));
  const sections = grantedItems.length ? [...visibleSections, { label: "Also for you", items: grantedItems }] : visibleSections;

  const allItems = sections.flatMap((s) => s.items);

  // Mobile priority: filter the default list to only items the trainee can access.
  const basePriority = MOBILE_PRIORITY[role] || MOBILE_PRIORITY.staff;
  const priorityKeys = basePriority.filter((k) =>
    allItems.some((i) => i.to === k)
  );
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
    <div className="studio-shell min-h-dvh flex flex-col lg:flex-row">
      <ForcePasswordChange />
      {/* ─── Large-screen navigation ─────────────────────────────
          Phones and tablets use the touch-first header + bottom navigation.
          The full sectioned sidebar starts at the desktop breakpoint. */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[272px] flex-col border-r border-sidebar-border bg-[linear-gradient(180deg,#3B0010_0%,#31000d_55%,#26000b_100%)] z-30 shadow-[12px_0_40px_rgba(35,5,14,.08)]">
        {/* Brand */}
        <div className="px-4 lg:px-5 h-[82px] flex items-center border-b border-sidebar-border shrink-0">
          <button
            onClick={() => go("dashboard")}
            className="flex items-center gap-3 group w-full justify-center lg:justify-start"
            title={shopDisplayName}
            aria-label={`${shopDisplayName} — dashboard`}
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
              <BrandMark size={30} />
            </div>
            <div className="min-w-0 text-left hidden lg:block">
              <p className="font-display text-[17px] font-semibold text-sidebar-foreground truncate leading-tight">
                {shopDisplayName}
              </p>
              <span
                className="inline-flex items-center text-[11px] font-medium mt-1 px-1.5 py-0.5 rounded-sm"
                style={{ backgroundColor: "#581A28", color: "#E1CDD1" }}
              >
                {ROLE_LABELS[role]} portal
              </span>
            </div>
          </button>
        </div>

        {/* Nav sections */}
        <nav
          aria-label="Primary"
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-slim px-3 lg:px-3.5 py-5"
        >
          <label className="mb-4 flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-white"><Search className="size-4 shrink-0"/><input aria-label="Search navigation" value={navSearch} onChange={e=>setNavSearch(e.target.value)} placeholder="Find a workspace" className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-white/60"/></label>
          {(() => {
            const BASICS = ["dashboard", "customers", "orders", "board"] as ViewKey[];
            const collapse = false; // every destination stays visible, grouped by section
            const basicItems = collapse ? allItems.filter((i) => BASICS.includes(i.to)) : [];
            const laterSections = collapse
              ? sections
                  .map((sec) => ({ ...sec, items: sec.items.filter((i) => !BASICS.includes(i.to)) }))
                  .filter((sec) => sec.items.length > 0)
              : sections.map(sec=>({...sec,items:sec.items.filter(i=>(i.label+" "+sec.label).toLowerCase().includes(navSearch.trim().toLowerCase()))})).filter(sec=>sec.items.length);
            const laterCount = laterSections.reduce((n, sec) => n + sec.items.length, 0);
            // Never hide the page the person is on.
            const showLater = !collapse || toolsOpen || laterSections.some((sec) => sec.items.some((i) => isActive(i.to)));

            const renderItem = ({ to, label, icon: Icon }: NavItem) => {
              const active = isActive(to);
              return (
                <button
                  key={to}
                  onClick={() => go(to)}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative w-full flex items-center justify-center lg:justify-start gap-3 h-11 lg:h-10 lg:px-3.5 rounded-xl text-[13px] transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-[#8b1835] to-[#a33b53] text-white font-semibold shadow-[0_5px_16px_rgba(20,0,7,.18)] ring-1 ring-white/10"
                      : "text-sidebar-foreground/65 hover:text-white hover:bg-white/[.07]"
                  )}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2 : 1.6} />
                  <span className="hidden lg:inline truncate">{label}</span>
                </button>
              );
            };

            const renderSection = (section: NavSection, si: number) => (
              <div key={section.label} className={cn(si > 0 && "mt-4 lg:mt-[18px]")}>
                {si > 0 && <div className="lg:hidden h-px bg-sidebar-border mx-3 mb-3" aria-hidden="true" />}
                <p className="hidden lg:block text-xs font-medium text-slate-400 px-3 mb-1.5">{section.label}</p>
                <div className="space-y-0.5">{section.items.map(renderItem)}</div>
              </div>
            );

            return (
              <>
                {collapse && basicItems.length > 0 && (
                  <div>
                    <p className="hidden lg:block text-xs font-medium text-slate-400 px-3 mb-1.5">Everyday</p>
                    <div className="space-y-0.5">{basicItems.map(renderItem)}</div>
                  </div>
                )}
                {collapse && laterCount > 0 && (
                  <button
                    type="button"
                    onClick={toggleTools}
                    aria-expanded={showLater}
                    title={showLater ? "Hide other tools" : "Show more tools"}
                    className="mt-4 lg:mt-[18px] w-full flex items-center justify-center lg:justify-between gap-3 h-10 lg:h-9 lg:px-3 rounded-lg text-[13px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 transition-colors"
                  >
                    <span className="hidden lg:inline">More tools ({laterCount})</span>
                    <ChevronDown
                      className={cn("w-[18px] h-[18px] shrink-0 transition-transform", showLater && "rotate-180")}
                      strokeWidth={1.6}
                    />
                  </button>
                )}
                {showLater && (
                  <div className={cn(collapse && "mt-2")}>
                    {laterSections.length===0 && <p className="px-3 py-4 text-sm text-white/70">No matching workspaces.</p>}
                    {laterSections.map((section, si) => renderSection(section, collapse ? si + 1 : si))}
                  </div>
                )}
              </>
            );
          })()}
        </nav>

        {/* User */}
        {user && (
          <div className="px-2.5 lg:px-3 py-3 border-t border-sidebar-border shrink-0">
            <div className="group w-full flex flex-col lg:flex-row items-center gap-1 lg:gap-2 rounded-lg lg:hover:bg-white/[0.05] transition-colors">
              <button
                onClick={() => go("profile")}
                className="flex lg:flex-1 min-w-0 items-center justify-center lg:justify-start gap-3 lg:px-2 py-1.5 rounded-lg text-left"
                title={`${user.fullName} · My profile`}
                aria-label="My profile"
              >
                <div className="relative shrink-0">
                  <div
                    className="w-9 h-9 rounded-full bg-[#692837] text-white flex items-center justify-center text-xs font-semibold ring-2 ring-offset-2 ring-offset-sidebar"
                    style={{ ["--tw-ring-color" as string]: roleAccent }}
                  >
                    {(user.fullName || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4A6B53] border-2 border-sidebar" />
                </div>
                <div className="hidden lg:block flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-sidebar-foreground truncate">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 group-hover:text-sidebar-primary transition-colors">
                    My profile
                  </p>
                </div>
              </button>
              <button
                onClick={() => logout()}
                className="shrink-0 w-9 h-9 lg:w-8 lg:h-8 lg:mr-1 rounded-lg flex items-center justify-center text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ─── Mobile top bar ──────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 pt-safe pl-safe pr-safe border-b border-[#EEDFE3] bg-white">
        {/* Logo on the left, page title in the middle, profile avatar on the
            right. The two outer columns are equal so the title stays centred. */}
        <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_4.75rem] items-center gap-2 px-4 h-14">
          <button
            onClick={() => go("dashboard")}
            aria-label="Sewsiness home"
            title={shopDisplayName}
            className="flex h-11 items-center justify-self-start"
          >
            <BrandLogo width={72} />
          </button>
          <h1 className="font-display text-base font-semibold text-[#2F151B] truncate min-w-0 text-center">
            {activeMeta.label}
          </h1>
          <button
            onClick={() => go("profile")}
            className="w-11 h-11 rounded-full bg-[#FCF8F9] text-[#800020] flex items-center justify-center text-sm font-semibold shrink-0 ring-2 justify-self-end"
            style={{ ["--tw-ring-color" as string]: roleAccent }}
            title={`${user?.fullName} · My profile`}
          >
            {(user?.fullName || "?").charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      {/* ─── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 lg:pl-[272px] pl-safe pr-safe pb-mobile-nav lg:pb-0 flex flex-col min-w-0 overflow-x-clip bg-[#faf6f4]">
        {/* Desktop top bar: studio name, today's date and the account menu. */}
        <div data-topbar className="hidden lg:flex sticky top-0 z-20 h-16 shrink-0 items-center justify-between gap-4 border-b border-[#EEDFE3] bg-[#faf6f4]/90 px-8 backdrop-blur-md">
          <div className="min-w-0">
            <h1 className="font-display text-lg font-semibold leading-tight text-[#2F151B] truncate">{activeMeta.label}</h1>
            <p className="text-xs text-stone-500 truncate">
              {shopDisplayName} · {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2.5 rounded-full border border-[#EEDFE3] bg-white py-1 pl-1 pr-3 text-left transition-colors hover:bg-[#FCF8F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A45]"
              aria-label="Account menu"
            >
              <span
                className="flex size-8 items-center justify-center rounded-full bg-[#800020] text-xs font-semibold text-white"
                style={{ boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${roleAccent}` }}
              >
                {(user?.fullName || "?").charAt(0).toUpperCase()}
              </span>
              <span className="hidden xl:block min-w-0">
                <span className="block max-w-[10rem] truncate text-[13px] font-medium text-[#2F151B]">{user?.fullName}</span>
                <span className="block text-[11px] text-stone-500">{ROLE_LABELS[role]}</span>
              </span>
              <ChevronDown className="size-4 text-stone-400" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-sm font-medium">{user?.fullName}</span>
                <span className="block truncate text-xs text-stone-500">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => go("profile")}>
                <UserRound className="size-4" /> My profile
              </DropdownMenuItem>
              {role === "madam" && (
                <DropdownMenuItem onSelect={() => go("settings")}>
                  <SettingsIcon className="size-4" /> Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => logout()}>
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {planAccess?.trialExpired ? (
          <div
            role="alert"
            className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between md:mx-8"
          >
            <span className="flex items-center gap-2">
              <Crown className="size-4 shrink-0" />
              Your two-month trial has ended. Your studio is view-only: everything you entered is kept and you can still open and export it. Choose Pro or Enterprise to add new entries again.
            </span>
            {user?.role === "madam" ? (
              <span className="flex shrink-0 flex-wrap items-center gap-3">
                <ExportButtons compact />
                <button onClick={() => go("settings")} className="text-left font-semibold underline underline-offset-2">
                  View plans
                </button>
              </span>
            ) : (
              <span className="shrink-0 text-xs">Ask your studio owner to upgrade.</span>
            )}
          </div>
        ) : planAccess?.daysRemaining !== null && planAccess?.daysRemaining !== undefined && planAccess.daysRemaining <= 14 ? (
          <div className="mx-4 mt-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between md:mx-8">
            <span className="flex items-center gap-2">
              <Clock3 className="size-4 shrink-0" />
              {planAccess.daysRemaining === 0
                ? "Your trial ends today."
                : `${planAccess.daysRemaining} ${planAccess.daysRemaining === 1 ? "day" : "days"} left in your trial. Choose Pro or Enterprise to keep going.`}
            </span>
            {user?.role === "madam" && (
              <button onClick={() => go("settings")} className="shrink-0 text-left font-semibold underline underline-offset-2">
                Choose a plan
              </button>
            )}
          </div>
        ) : null}
        {menuSettingsError && (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:mx-8"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            Menu availability could not be loaded. Some features may be unavailable.
          </div>
        )}
        <div key={view} className="w-full max-w-[1480px] mx-auto flex-1 flex flex-col min-w-0 animate-fade-in">
          {children}
        </div>
      </main>

      {/* ─── Phone + tablet bottom navigation (priority + More) ── */}
      <nav aria-label="Primary mobile navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-30 pb-safe pl-safe pr-safe border-t border-[#EEDFE3] bg-white">
        <div className="flex items-center justify-around h-14">
          {mobileItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <button
                key={to}
                type="button"
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={() => go(to)}
                className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 h-full relative min-w-0 flex-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#800020]"
              >
                {active && (
                  <span className="absolute top-0 w-8 h-0.5 bg-[#800020] rounded-full" />
                )}
                <Icon
                  className={cn("w-5 h-5 transition-colors shrink-0", active ? "text-[#800020]" : "text-stone-600")}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span
                  className={cn(
                    "text-[11px] leading-tight transition-colors truncate w-full text-center",
                    active ? "text-[#800020] font-semibold" : "text-stone-600"
                  )}
                >
                  {SHORT_LABEL[to] ?? label}
                </span>
              </button>
            );
          })}
          {(moreItems.length > 0 || !!user) && (
            <button
              ref={moreTriggerRef}
              type="button"
              aria-label="Workspace menu"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 h-full min-w-0 flex-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#800020]"
            >
              <Menu
                className={cn("w-5 h-5 shrink-0", moreOpen || moreItems.some(item => isActive(item.to)) ? "text-[#800020]" : "text-stone-400")}
                strokeWidth={1.5}
              />
              <span className={cn("text-[11px] leading-tight", moreOpen || moreItems.some(item => isActive(item.to)) ? "font-semibold text-[#800020]" : "text-stone-400")}>Menu</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile workspace navigation: same permission-filtered destinations as desktop. */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-[#210b13]/45 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div ref={moreDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="workspace-menu-title"
            className="absolute inset-y-0 left-0 flex w-[min(100%,360px)] flex-col bg-white outline-none shadow-xl pt-safe pb-safe pl-safe"
            onClick={e => e.stopPropagation()}>
            <div className="shrink-0 bg-[#350b19] px-5 pb-5 pt-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-white"><BrandMark size={28}/></div>
                  <div className="min-w-0"><h2 id="workspace-menu-title" className="truncate text-base font-semibold">{shopDisplayName}</h2><p className="text-xs text-[#e1c8b3]">{ROLE_LABELS[role]} workspace</p></div>
                </div>
                <button type="button" aria-label="Close workspace menu" onClick={()=>setMoreOpen(false)} className="grid size-11 shrink-0 place-items-center rounded-md text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9b779]"><X className="size-5"/></button>
              </div>
            </div>
            <div className="shrink-0 border-b border-[#eee5e6] px-4 py-3">
              <div className="flex h-11 items-center gap-2 rounded-md border border-[#ded4d7] bg-[#faf8f8] px-3 focus-within:border-[#800020] focus-within:ring-1 focus-within:ring-[#800020]">
                <Search className="size-4 shrink-0 text-stone-500" aria-hidden="true"/>
                <input aria-label="Search navigation" type="search" value={moreSearch} onChange={e=>setMoreSearch(e.target.value)} placeholder="Find a page" className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-base text-[#2f151b] !outline-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 placeholder:text-stone-500"/>
                {moreSearch&&<button type="button" aria-label="Clear search" onClick={()=>setMoreSearch("")} className="grid size-8 place-items-center text-stone-600"><X className="size-4"/></button>}
              </div>
            </div>
            <nav aria-label="Workspace destinations" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
              {sections.map(section=>{
                const items=section.items.filter(item=>(item.label+" "+section.label).toLowerCase().includes(moreSearch.trim().toLowerCase()));
                if(!items.length)return null;
                return <section key={section.label} className="border-b border-[#f0e9ea] py-3 last:border-0">
                  <h3 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">{section.label==="Money"?"Finance":section.label==="Admin"?"Administration":section.label}</h3>
                  {items.map(({to,label,icon:Icon})=>{
                    const active=isActive(to);
                    return <button key={to} type="button" aria-current={active?"page":undefined} onClick={()=>{go(to);setMoreOpen(false)}} className={cn("relative flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] leading-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#800020]",active?"bg-[#f5e9ed] font-semibold text-[#800020]":"font-medium text-[#40343a] hover:bg-[#f8f5f5]")}>
                      {active&&<span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-[#800020]" aria-hidden="true"/>}
                      <Icon className="size-[19px] shrink-0" strokeWidth={1.7} aria-hidden="true"/><span className="min-w-0 flex-1">{label}</span>{active&&<ChevronRight className="size-4 shrink-0" aria-hidden="true"/>}
                    </button>
                  })}
                </section>
              })}
              {moreSearch.trim()&&!allItems.some(item=>sections.some(section=>section.items.includes(item)&&(item.label+" "+section.label).toLowerCase().includes(moreSearch.trim().toLowerCase())))&&<p className="px-3 py-8 text-sm text-stone-600">No matching pages. Try a different search.</p>}
            </nav>
            <div className="shrink-0 border-t border-[#eee5e6] bg-[#faf8f8] px-3 py-2">
              <div className="flex items-center gap-1">
                <button type="button" aria-current={view==="profile"?"page":undefined} onClick={()=>{go("profile");setMoreOpen(false)}} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md px-2 text-left hover:bg-white focus-visible:outline focus-visible:outline-[#800020]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#800020] text-sm font-semibold text-white">{(user?.fullName||"?").charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#2f151b]">{user?.fullName||"My profile"}</span><span className="block text-xs text-stone-600">My account</span></span><ChevronRight className="size-4 shrink-0 text-stone-500"/>
                </button>
                <button type="button" aria-label="Sign out" title="Sign out" onClick={()=>{setMoreOpen(false);logout()}} className="grid size-11 shrink-0 place-items-center rounded-md text-stone-600 hover:bg-white hover:text-[#800020] focus-visible:outline focus-visible:outline-[#800020]"><LogOut className="size-5" strokeWidth={1.7}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
