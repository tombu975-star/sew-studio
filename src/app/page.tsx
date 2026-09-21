"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/atelier/AppShell";
import { Providers } from "@/components/Providers";
import { LoginPage } from "@/components/atelier/LoginPage";
import { useAuth } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { Scissors } from "lucide-react";

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
      return <Orders />;
    case "order":
      return <OrderDetail />;
    case "new-order":
      return <NewOrder />;
    case "board":
      return <ProductionBoard />;
    case "fittings":
      return <Fittings />;
    case "tasks":
      return <Tasks />;
    case "style-assist":
      return <StyleAssist />;
    case "quote":
      return <QuickQuote />;
    default:
      return <Dashboard />;
  }
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBF9F7] gap-4">
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
  const { status, hydrate } = useAuth();

  useEffect(() => {
    if (status === "loading") hydrate();
  }, [status, hydrate]);

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
