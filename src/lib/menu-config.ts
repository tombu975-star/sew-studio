import type { ViewKey } from "@/stores/nav";

export const MENU_DEFINITIONS = [
  { key: "dashboard", label: "Dashboard", section: "Overview" },
  { key: "customers", label: "Customers", section: "Clients" },
  { key: "orders", label: "Orders", section: "Studio" },
  { key: "board", label: "Board", section: "Studio" },
  { key: "fittings", label: "Fittings", section: "Studio" },
  { key: "tasks", label: "Tasks", section: "Studio" },
  { key: "quote", label: "Quotes", section: "Studio" },
  { key: "payments", label: "Payments", section: "Money" },
  { key: "costing", label: "True Costing", section: "Money" },
  { key: "projection", label: "Business Projection", section: "Money" },
  { key: "accra-runs", label: "Accra Runs", section: "Studio" },
  { key: "assets", label: "Inventory", section: "Studio" },
  { key: "style-assist", label: "Style Assist", section: "Studio" },
  { key: "team", label: "Team", section: "People" },
  { key: "community", label: "Community", section: "People" },
  { key: "curriculum", label: "Curriculum", section: "Learning" },
  { key: "progress", label: "Progress", section: "Learning" },
  { key: "portfolio", label: "Portfolio", section: "Learning" },
  { key: "certificate", label: "Certificates", section: "Learning" },
  { key: "messages", label: "Messages", section: "Clients" },
  { key: "my-jobs", label: "My Jobs", section: "Work" },
  { key: "settings", label: "Settings", section: "Admin" },
] as const;

export type MenuKey = (typeof MENU_DEFINITIONS)[number]["key"];

const VIEW_MENU: Partial<Record<ViewKey, MenuKey>> = {
  dashboard: "dashboard",
  customers: "customers",
  customer: "customers",
  orders: "orders",
  order: "orders",
  "new-order": "orders",
  board: "board",
  fittings: "fittings",
  tasks: "tasks",
  "style-assist": "style-assist",
  quote: "quote",
  costing: "costing",
  team: "team",
  community: "community",
  progress: "progress",
  curriculum: "curriculum",
  portfolio: "portfolio",
  certificate: "certificate",
  messages: "messages",
  "my-jobs": "my-jobs",
  settings: "settings",
  payments: "payments",
  projection: "projection",
  "accra-runs": "accra-runs",
  assets: "assets",
};

export function menuForView(view: ViewKey): MenuKey | undefined {
  return VIEW_MENU[view];
}

const API_MENU_PREFIXES: readonly [string, MenuKey][] = [
  ["/api/dashboard", "dashboard"],
  ["/api/insights", "dashboard"],
  ["/api/customers", "customers"],
  ["/api/measurements", "customers"],
  ["/api/orders", "orders"],
  ["/api/accra-runs", "accra-runs"],
  ["/api/assets", "assets"],
  ["/api/fittings", "fittings"],
  ["/api/tasks", "tasks"],
  ["/api/style-assist", "style-assist"],
  ["/api/style-concepts", "style-assist"],
  ["/api/users", "team"],
  ["/api/freelancers", "team"],
  ["/api/community", "community"],
  ["/api/training-programs", "curriculum"],
  ["/api/competency-units", "curriculum"],
  ["/api/training-logs", "progress"],
  ["/api/certificates", "certificate"],
  ["/api/portfolio", "portfolio"],
  ["/api/messages", "messages"],
  ["/api/freelance-jobs", "team"],
  ["/api/freelancer/jobs", "my-jobs"],
  ["/api/settings", "settings"],
];

export function menuForApiPath(pathname: string): MenuKey | undefined {
  if (/^\/api\/customers\/[^/]+\/send-message(?:\/|$)/.test(pathname)) {
    return "messages";
  }
  if (/^\/api\/orders\/[^/]+\/fittings(?:\/|$)/.test(pathname)) {
    return "fittings";
  }
  return API_MENU_PREFIXES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )?.[1];
}

export function menuForPagePath(pathname: string): MenuKey | undefined {
  if (pathname === "/freelancer" || pathname.startsWith("/freelancer/")) {
    return "my-jobs";
  }
  return undefined;
}
