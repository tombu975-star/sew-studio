"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/atelier/AppShell";
import { Providers } from "@/components/Providers";
import { PlatformExperience } from "@/components/atelier/PlatformExperience";
import { PlatformLogin } from "@/components/atelier/PlatformLogin";
import { useAuth } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { setOnSessionExpired } from "@/lib/api";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { Scissors, Lock, Crown } from "lucide-react";
import { menuForView, MENU_DEFINITIONS } from "@/lib/menu-config";
import { useMenuSettings } from "@/stores/menu-settings";
import { getPlanEntitlements, requiredPlanForFeature } from "@/lib/plans";

// Load all views lazily so each is a separate client bundle.
const Dashboard = dynamic(() => import("@/views/Dashboard").then((m) => m.default), { ssr: false });
const Customers = dynamic(() => import("@/views/Customers").then((m) => m.default), { ssr: false });
const CustomerProfile = dynamic(() => import("@/views/CustomerProfile").then((m) => m.default), { ssr: false });
const Orders = dynamic(() => import("@/views/Orders").then((m) => m.default), { ssr: false });
const OrderDetail = dynamic(() => import("@/views/OrderDetail").then((m) => m.default), { ssr: false });
const NewOrder = dynamic(() => import("@/views/NewOrder").then((m) => m.default), { ssr: false });
const ProductionBoard = dynamic(() => import("@/views/ProductionBoard").then((m) => m.default), { ssr: false });
const Fittings = dynamic(() => import("@/views/Fittings").then((m) => m.default), { ssr: false });
const Tasks = dynamic(() => import("@/views/Tasks").then((m) => m.default), { ssr: false });
const StyleAssist = dynamic(() => import("@/views/StyleAssist").then((m) => m.default), { ssr: false });
const QuickQuote = dynamic(() => import("@/views/QuickQuote").then((m) => m.default), { ssr: false });
const Team = dynamic(() => import("@/views/Team").then((m) => m.default), { ssr: false });
const Community = dynamic(() => import("@/views/Community").then((m) => m.default), { ssr: false });
const Progress = dynamic(() => import("@/views/Progress").then((m) => m.default), { ssr: false });
const Curriculum = dynamic(() => import("@/views/Curriculum").then((m) => m.default), { ssr: false });
const Portfolio = dynamic(() => import("@/views/Portfolio").then((m) => m.default), { ssr: false });
const Certificate = dynamic(() => import("@/views/Certificate").then((m) => m.default), { ssr: false });
const Messages = dynamic(() => import("@/views/Messages").then((m) => m.default), { ssr: false });
const MyJobs = dynamic(() => import("@/views/MyJobs").then((m) => m.default), { ssr: false });
const Settings = dynamic(() => import("@/views/Settings").then((m) => m.default), { ssr: false });
const UserProfile = dynamic(() => import("@/views/UserProfile").then((m) => m.default), { ssr: false });

function CurrentView() {
  const { view, go } = useNav();
  const user = useAuth((state) => state.user);
  const enabledMenus = useMenuSettings((state) => state.enabled);
  const menuKey = menuForView(view);
  const menu = menuKey ? MENU_DEFINITIONS.find((item) => item.key === menuKey) : undefined;
  if (menuKey && enabledMenus?.[menuKey] === false) {
    const planFeatures = user?.shop
      ? getPlanEntitlements(user.shop.plan, user.shop.trial_ends_at).features
      : [];
    const planLocked = !planFeatures.includes(menuKey);
    const requiredPlan = requiredPlanForFeature(menuKey);
    return (
      <div className="mx-auto w-full max-w-lg p-5 md:p-8">
        <div className="rounded-2xl border border-[#E8DDD5] bg-white p-7 text-center shadow-sm sm:p-9">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#8E3232]/10 text-[#8E3232]">
            {planLocked ? <Crown className="size-5" /> : <Lock className="size-5" />}
          </span>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#8E3232]">
            {planLocked ? "A little more room to grow" : "Studio feature"}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-[#302623]">
            {menu?.label ?? "This feature"} is {planLocked ? "part of a higher plan" : "unavailable"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
            {planLocked
              ? `Upgrade to ${requiredPlan === "enterprise" ? "Enterprise" : "Pro"} to bring this tool into your studio.`
              : "This feature is currently disabled by the platform administrator."}
          </p>
          {planLocked && user?.role === "madam" ? (
            <button
              type="button"
              onClick={() => go("settings")}
              className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#782f43] px-4 text-sm font-semibold text-white hover:bg-[#632638]"
            >
              <Crown className="size-4" /> View plans
            </button>
          ) : planLocked ? (
            <p className="mt-5 text-xs text-stone-500">Ask your studio owner about upgrading.</p>
          ) : null}
        </div>
      </div>
    );
  }
  switch (view) {
    case "dashboard": return <Dashboard />;
    case "customers": return <Customers />;
    case "customer": return <CustomerProfile />;
    case "orders": return <GuardView view="orders"><Orders /></GuardView>;
    case "order": return <GuardView view="orders"><OrderDetail /></GuardView>;
    case "new-order": return <GuardView view="orders"><NewOrder /></GuardView>;
    case "board": return <GuardView view="board"><ProductionBoard /></GuardView>;
    case "fittings": return <Fittings />;
    case "tasks": return <Tasks />;
    case "style-assist": return <StyleAssist />;
    case "quote": return <QuickQuote />;
    case "team": return <Team />;
    case "community": return <Community />;
    case "progress": return <Progress />;
    case "curriculum": return <Curriculum />;
    case "portfolio": return <Portfolio />;
    case "certificate": return <Certificate />;
    case "messages": return <Messages />;
    case "my-jobs": return <MyJobs />;
    case "settings": return <Settings />;
    case "profile": return <UserProfile />;
    default: return <Dashboard />;
  }
}

function GuardView({ view, children }: { view: "orders" | "board"; children: React.ReactNode }) {
  const { user } = useAuth();
  const { go } = useNav();
  const isTrainee = user?.role === "trainee";
  const permitted = view === "orders" ? user?.canAccessOrders : user?.canAccessBoard;
  if (isTrainee && !permitted) {
    return (
      <div className="p-5 md:p-8 max-w-md mx-auto w-full">
        <div className="surface-premium border border-[#E2E8F0] rounded-lg elevate-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#2563EB]/8 flex items-center justify-center mx-auto mb-4"><Lock className="w-6 h-6 text-[#2563EB]" /></div>
          <h2 className="font-display text-xl font-semibold text-[#0F172A]">Access not yet granted</h2>
          <p className="text-sm text-stone-500 mt-2 leading-relaxed">Your trainer hasn&apos;t granted you access to {view === "orders" ? "Orders" : "the Production Board"} yet. Once they feel you&apos;re ready, they&apos;ll unlock it for you.</p>
          <button onClick={() => go("dashboard")} className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-md hover:bg-[#1D4ED8] transition">Back to dashboard</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function FullScreenLoader() {
  return (
    <div role="status" aria-label="Loading" className="min-h-dvh flex flex-col items-center justify-center bg-[#F8FAFC]">
      <div className="flex size-11 items-center justify-center rounded-md bg-[#2563EB]"><Scissors className="size-5 text-white" strokeWidth={2} /></div>
      <div className="mt-6 h-0.5 w-24 overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full w-1/2 animate-[loader-slide_1.1s_ease-in-out_infinite] rounded-full bg-[#2563EB]" /></div>
    </div>
  );
}

function AuthGate() {
  const { status, hydrate } = useAuth();
  useIdleLogout(status === "authenticated");

  useEffect(() => {
    if (status === "loading") hydrate();
  }, [status, hydrate]);

  useEffect(() => {
    setOnSessionExpired(() => {
      const current = useAuth.getState();
      if (current.status === "authenticated") return;
      hydrate();
    });
  }, [hydrate]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const warm = () => {
      void import("@/views/Orders");
      void import("@/views/Customers");
      void import("@/views/CustomerProfile");
      void import("@/views/ProductionBoard");
      void import("@/views/Tasks");
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(warm, 2500);
    return () => clearTimeout(t);
  }, [status]);

  if (status === "loading") return <FullScreenLoader />;
  if (status === "unauthenticated") return <PlatformLogin />;
  return <AppShell><CurrentView /></AppShell>;
}

export default function Page() {
  return (
    <PlatformExperience>
      <Providers><AuthGate /></Providers>
    </PlatformExperience>
  );
}
