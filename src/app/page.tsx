"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/atelier/AppShell";
import { Providers } from "@/components/Providers";
import { LoginPage } from "@/components/atelier/LoginPage";
import { useAuth } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { setOnSessionExpired } from "@/lib/api";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { Scissors, Lock } from "lucide-react";

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

function CurrentView() {
  const { view } = useNav();
  switch (view) {
    case "dashboard":
      return <Dashboard />;
    case "customers":
      return <Customers />;
    case "customer":
      return <CustomerProfile />;
    case "orders":
      return <GuardView view="orders"><Orders /></GuardView>;
    case "order":
      return <GuardView view="orders"><OrderDetail /></GuardView>;
    case "new-order":
      return <GuardView view="orders"><NewOrder /></GuardView>;
    case "board":
      return <GuardView view="board"><ProductionBoard /></GuardView>;
    case "fittings":
      return <Fittings />;
    case "tasks":
      return <Tasks />;
    case "style-assist":
      return <StyleAssist />;
    case "quote":
      return <QuickQuote />;
    case "team":
      return <Team />;
    case "community":
      return <Community />;
    case "progress":
      return <Progress />;
    case "curriculum":
      return <Curriculum />;
    case "portfolio":
      return <Portfolio />;
    case "certificate":
      return <Certificate />;
    case "messages":
      return <Messages />;
    case "my-jobs":
      return <MyJobs />;
    case "settings":
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

/**
 * Guards a view behind a trainee permission (orders / board).
 * Trainees without the permission see a friendly "ask your trainer" notice.
 * Non-trainees always pass.
 */
function GuardView({
  view,
  children,
}: {
  view: "orders" | "board";
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { go } = useNav();
  const isTrainee = user?.role === "trainee";
  const permitted =
    view === "orders" ? user?.canAccessOrders : user?.canAccessBoard;
  if (isTrainee && !permitted) {
    return (
      <div className="p-5 md:p-8 max-w-md mx-auto w-full">
        <div className="surface-premium border border-[#E7E5E4] rounded-lg elevate-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[#800020]/8 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-[#800020]" />
          </div>
          <h2 className="font-display text-xl font-semibold text-[#1C1917]">
            Access not yet granted
          </h2>
          <p className="text-sm text-stone-500 mt-2 leading-relaxed">
            Your trainer hasn&apos;t granted you access to{" "}
            {view === "orders" ? "Orders" : "the Production Board"} yet. Once
            they feel you&apos;re ready, they&apos;ll unlock it for you.
          </p>
          <button
            onClick={() => go("dashboard")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#800020] text-white text-sm font-medium rounded-md hover:bg-[#6b0018] transition"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function FullScreenLoader() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#FBF9F7] gap-4">
      <div className="w-12 h-12 rounded-full border border-[#800020] flex items-center justify-center">
        <Scissors className="w-5 h-5 text-[#800020]" />
      </div>
      <div className="w-6 h-6 border-2 border-[#E7E5E4] border-t-[#800020] rounded-full animate-spin" />
      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">
        Preparing the atelier…
      </p>
    </div>
  );
}

function AuthGate() {
  const { status, hydrate, user } = useAuth();

  useIdleLogout(status === "authenticated");

  useEffect(() => {
    if (status === "loading") hydrate();
  }, [status, hydrate]);

  // Wire up the global 401 handler. Only re-hydrate if we're NOT already
  // in a login flow — otherwise a transient 401 (race during login) would
  // loop: login → dashboard 401 → hydrate → authenticated → dashboard 401…
  useEffect(() => {
    setOnSessionExpired(() => {
      // If the user is already authenticated but getting 401s, it's a race —
      // wait a tick and refetch will happen naturally. Only force logout if
      // we're unauthenticated (genuine session expiry).
      const current = useAuth.getState();
      if (current.status === "authenticated") {
        // Don't loop — just let the queries retry. The cookie will be present
        // on the next attempt.
        return;
      }
      hydrate();
    });
  }, [hydrate]);

  if (status === "loading") return <FullScreenLoader />;
  if (status === "unauthenticated") return <LoginPage />;

  return (
    <AppShell>
      <CurrentView />
    </AppShell>
  );
}

export default function Page() {
  return (
    <Providers>
      <AuthGate />
    </Providers>
  );
}
