"use client";

/**
 * Portfolio — a luxury lookbook gallery of the atelier's finished pieces.
 *
 * Two modes (driven by role):
 *  - Owner / Trainer (canSeeAllCustomers): studio-wide portfolio with a staff
 *    filter Select. Default = All = every completed/collected order.
 *  - Staff / Trainee (self-scoped): only their own portfolio (auto-filter
 *    staffId = user.id). No filter Select.
 *
 * Data:
 *  - GET /api/portfolio               → Order[] (studio-wide)
 *  - GET /api/portfolio?staffId=ID    → that person's portfolio
 *  - GET /api/users                   → User[] (for the staff filter)
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon, Scissors, CalendarDays, User } from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
import { LearningTabs } from "@/components/atelier/LearningTabs";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import { EmptyState, SkeletonCard } from "@/components/atelier/EmptyState";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiGet } from "@/lib/api";
import { shortDate } from "@/lib/format";
import type { Order, User as UserType } from "@/lib/types";
import { useAuth } from "@/stores/auth";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";

export default function Portfolio() {
  const { user } = useAuth();
  const { canSeeAllCustomers, isTrainee } = useRole();
  const go = useNav((s) => s.go);

  const canSeeAll = canSeeAllCustomers();
  const selfScoped = !canSeeAll;
  const traineeSelf = isTrainee();

  // Owner / trainer can switch between studio-wide and a person's portfolio.
  // Staff / trainee is locked to their own (effectiveStaffId = user.id).
  const [staffFilter, setStaffFilter] = useState<string>("all");

  const effectiveStaffId = selfScoped
    ? user?.id ?? ""
    : staffFilter === "all"
    ? ""
    : staffFilter;

  const portfolioQuery = useQuery<Order[]>({
    queryKey: ["portfolio", effectiveStaffId || "all"],
    queryFn: () =>
      apiGet<Order[]>(
        effectiveStaffId
          ? `/api/portfolio?staffId=${encodeURIComponent(effectiveStaffId)}`
          : "/api/portfolio"
      ),
    enabled: !selfScoped || !!user,
  });

  const usersQuery = useQuery<UserType[]>({
    queryKey: ["users"],
    queryFn: () => apiGet<UserType[]>("/api/users"),
    enabled: canSeeAll,
  });

  const portfolio = portfolioQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const stats = useMemo(() => {
    const total = portfolio.length;
    const withPhotos = portfolio.filter((o) => !!o.designImage).length;
    const now = new Date();
    const thisYear = portfolio.filter((o) => {
      const d = new Date(o.orderDate);
      return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear();
    }).length;
    return { total, withPhotos, thisYear };
  }, [portfolio]);

  const subtitle = selfScoped
    ? "Your completed pieces from the atelier."
    : "A showcase of finished pieces from the atelier.";

  const isLoading = portfolioQuery.isLoading;
  const isError = portfolioQuery.isError;

  return (
    <div className="p-5 md:p-8 max-w-[1300px] mx-auto w-full">
      <PageHeader
        eyebrow="Our work"
        eyebrowIcon={ImageIcon}
        title="Portfolio"
        subtitle={subtitle}
        actions={
          canSeeAll ? (
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger
                className="w-full sm:w-[200px] h-9 bg-white"
                aria-label="Filter by staff member"
              >
                <SelectValue placeholder="All staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />
      <LearningTabs current="portfolio" />

      {/* Premium stat strip */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 animate-fade-in-up">
        <PremiumMetric
          label="Total Pieces"
          value={<AnimatedNumber value={stats.total} />}
          icon={ImageIcon}
          accent
        />
        <PremiumMetric
          label="With Photos"
          value={<AnimatedNumber value={stats.withPhotos} />}
          icon={ImageIcon}
        />
        <PremiumMetric
          label="This Year"
          value={<AnimatedNumber value={stats.thisYear} />}
          icon={CalendarDays}
        />
      </div>

      {/* Gallery */}
      {isError ? (
        <SectionCard>
          <EmptyState
            icon={ImageIcon}
            title="Couldn't load the gallery"
            description="Please refresh the page to try again."
          />
        </SectionCard>
      ) : isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard
              key={i}
              className="aspect-[3/4] flex flex-col justify-end p-4"
            />
          ))}
        </div>
      ) : portfolio.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={ImageIcon}
            title={
              selfScoped
                ? "You haven't completed any pieces yet."
                : "No completed work yet."
            }
            description={
              selfScoped
                ? "Finished and collected orders assigned to you will appear here as a personal gallery."
                : "Completed and collected orders will appear here as a studio gallery."
            }
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {portfolio.map((order, idx) => (
            <GalleryCard
              key={order.id}
              order={order}
              index={idx}
              onClick={() => go("order", { id: order.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Gallery card ------------------------------ */

function GalleryCard({
  order,
  index,
  onClick,
}: {
  order: Order;
  index: number;
  onClick: () => void;
}) {
  const garment = order.garmentDesign || "Untitled piece";
  const customerName = order.customer?.name ?? "—";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg overflow-hidden border border-[#EEDFE3] surface-premium elevate-sm lift group hover:border-[#832138]/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#832138]/30 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
      aria-label={`View ${garment} for ${customerName}`}
    >
      {/* Image area — 3/4 portrait lookbook frame */}
      <div className="aspect-[3/4] bg-[#FCF8F9] relative overflow-hidden">
        {order.designImage ? (
          <>
            <img
              src={order.designImage}
              alt={garment}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            {/* subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-3 text-center">
            <div className="w-12 h-12 rounded-full bg-white border border-[#EEDFE3] flex items-center justify-center shadow-sm">
              <Scissors className="w-5 h-5 text-stone-400" />
            </div>
            <p className="text-xs text-stone-500 font-medium line-clamp-2 leading-tight">
              {garment}
            </p>
          </div>
        )}

        {/* floating status chip — keeps Completed/Collected visible at a glance */}
        <div className="absolute top-2 right-2">
          <StatusBadge
            status={order.status}
            className="bg-white/95 backdrop-blur-sm shadow-sm"
          />
        </div>
      </div>

      {/* Info area */}
      <div className="p-3 space-y-1">
        <p className="font-medium text-sm text-[#2F151B] truncate group-hover:text-[#832138] transition-colors">
          {garment}
        </p>
        <div className="flex items-center gap-1 text-xs text-stone-500">
          <User className="w-3 h-3 shrink-0 text-stone-400" />
          <span className="truncate">{customerName}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-stone-400 tabular-nums">
          <CalendarDays className="w-3 h-3 shrink-0" />
          <span>{shortDate(order.orderDate)}</span>
        </div>
      </div>
    </button>
  );
}
