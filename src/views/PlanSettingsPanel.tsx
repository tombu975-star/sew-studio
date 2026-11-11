"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  Clock3,
  Crown,
  LockKeyhole,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { SectionCard } from "@/components/atelier/SectionCard";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/api";
import { MENU_DEFINITIONS } from "@/lib/menu-config";
import { PLANS, type PlanKey } from "@/lib/plans";

interface PlanRequest {
  id: string;
  requestedPlan: PlanKey;
  status: "pending" | "approved" | "declined";
  message: string;
  createdAt: string;
  updatedAt: string;
}

interface PlanData {
  plan: PlanKey;
  trialExpired: boolean;
  trialEndsAt: string | null;
  trialStartedAt: string;
  daysRemaining: number | null;
  memberCount: number;
  maxMembers: number | null;
  latestRequest: PlanRequest | null;
}

export function PlanSettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery<PlanData>({
    queryKey: ["plan"],
    queryFn: () => apiGet<PlanData>("/api/plan"),
  });
  const [requestingPlan, setRequestingPlan] = useState<PlanKey | null>(null);

  async function requestUpgrade(plan: PlanKey) {
    setRequestingPlan(plan);
    try {
      await apiPost<PlanRequest>("/api/plan/upgrade-request", { plan });
      toast.success(`${PLANS[plan].name} upgrade request sent`);
      await queryClient.invalidateQueries({ queryKey: ["plan"] });
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not send your upgrade request."));
    } finally {
      setRequestingPlan(null);
    }
  }

  if (isLoading) {
    return <div className="h-56 animate-pulse rounded-xl bg-stone-100" aria-label="Loading plan details" />;
  }
  if (isError || !data) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Couldn&apos;t load your plan. Refresh the page and try again.
      </div>
    );
  }

  const currentIndex = (["trial", "pro", "enterprise"] as const).indexOf(data.plan);
  const request = data.latestRequest;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#8E3232]">Studio plan</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[#2F151B]">Try everything, then choose your plan</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">
          Your two-month trial includes every Pro and Enterprise feature so you can see the whole app. When it ends, choose Pro or Enterprise to carry on. Send a request and our team will follow up to activate it.
        </p>
      </div>

      <SectionCard className="!p-0 overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#8E3232]/10 text-[#8E3232]">
              {data.trialExpired ? <LockKeyhole className="size-5" /> : <Crown className="size-5" />}
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Current plan</p>
              <p className="mt-0.5 text-lg font-semibold capitalize text-[#2F151B]">{data.plan}</p>
              <p className="mt-1 text-sm text-stone-500">
                {data.plan === "trial"
                  ? data.trialExpired
                    ? "Your two-month trial has ended. Your studio is in read-only mode and your data is safe. Choose Pro or Enterprise to carry on."
                    : `${data.daysRemaining} ${data.daysRemaining === 1 ? "day" : "days"} left in your two-month trial, with every Pro and Enterprise feature included.`
                  : PLANS[data.plan].summary}
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-stone-50 px-4 py-3 text-sm sm:min-w-48">
            <div className="mb-1 flex items-center gap-2 text-stone-500">
              <UsersRound className="size-4" />
              Studio members
            </div>
            <p className="font-semibold text-[#2F151B]">
              {data.memberCount}
              <span className="font-normal text-stone-500">
                {data.maxMembers === null ? " · unlimited" : ` / ${data.maxMembers}`}
              </span>
            </p>
          </div>
        </div>
        {data.plan === "trial" && data.trialEndsAt && (
          <div className="flex items-center gap-2 border-t border-stone-100 bg-stone-50/70 px-5 py-3 text-xs text-stone-500">
            <Clock3 className="size-4 shrink-0" />
            Your trial started {new Date(data.trialStartedAt).toLocaleDateString(undefined, { dateStyle: "long" })} and ends{" "}
            {new Date(data.trialEndsAt).toLocaleDateString(undefined, { dateStyle: "long" })}.
            After that, choose Pro or Enterprise to carry on. Until you do, your data stays available to view but changes are paused.
          </div>
        )}
      </SectionCard>

      {request && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            request.status === "pending"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : request.status === "approved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-stone-200 bg-stone-50 text-stone-700"
          }`}
        >
          <p className="font-semibold capitalize">
            {request.status === "pending"
              ? `${PLANS[request.requestedPlan].name} upgrade request under review`
              : `${PLANS[request.requestedPlan].name} request ${request.status}`}
          </p>
          <p className="mt-1 text-xs opacity-80">
            {request.status === "pending"
              ? "A platform administrator will review your request. You can continue using your current plan in the meantime."
              : `Updated ${new Date(request.updatedAt).toLocaleDateString()}.`}
          </p>
          {request.message && <p className="mt-2 text-xs">{request.message}</p>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.values(PLANS) as (typeof PLANS)[PlanKey][]).map((plan, index) => {
          const isCurrent = plan.key === data.plan;
          const requested = request?.status === "pending" && request.requestedPlan === plan.key;
          const isUpgrade = index > currentIndex;
          return (
            <SectionCard
              key={plan.key}
              className={`relative flex flex-col !p-5 ${
                isCurrent ? "border-[#8E3232]/40 ring-1 ring-[#8E3232]/15" : ""
              }`}
            >
              {plan.key === "pro" && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-[#8E3232] px-2.5 py-1 text-[10px] font-semibold text-white">
                  <Sparkles className="size-3" /> Popular
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[#2F151B]">{plan.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-[#8E3232]/10 px-2 py-1 text-[10px] font-semibold text-[#8E3232]">
                    Your plan
                  </span>
                )}
              </div>
              <p className="mt-2 min-h-10 text-xs leading-relaxed text-stone-500">{plan.summary}</p>
              <p className="mt-4 text-sm font-medium text-stone-700">
                {plan.maxMembers === null ? "Unlimited members" : `Up to ${plan.maxMembers} members`}
              </p>
              <ul className="mt-4 flex-1 space-y-3">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2 text-xs leading-relaxed text-stone-600">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-[#4A6B53]" />
                    {highlight}
                  </li>
                ))}
                <li className="border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500">
                  Tools: {plan.features
                    .map((key) => MENU_DEFINITIONS.find((item) => item.key === key)?.label)
                    .filter(Boolean)
                    .join(", ")}
                </li>
              </ul>
              <button
                type="button"
                disabled={!isUpgrade || Boolean(request?.status === "pending") || requestingPlan !== null}
                onClick={() => void requestUpgrade(plan.key)}
                className={`mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  isCurrent
                    ? "bg-stone-100 text-stone-500"
                    : requested
                      ? "bg-amber-100 text-amber-800"
                      : isUpgrade
                        ? "bg-[#8E3232] text-white hover:bg-[#762929] disabled:opacity-50"
                        : "border border-stone-200 bg-white text-stone-500"
                }`}
              >
                {requestingPlan === plan.key
                  ? "Sending request…"
                  : isCurrent
                    ? "Current plan"
                    : requested
                      ? "Request pending"
                      : isUpgrade
                        ? `Request ${plan.name}`
                        : "Included in your plan"}
              </button>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
