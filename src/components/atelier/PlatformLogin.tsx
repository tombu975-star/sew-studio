"use client";

import { Scissors, Sparkles } from "lucide-react";
import { LoginPage } from "@/components/atelier/LoginPage";
import { usePlatformSettings } from "@/components/atelier/PlatformExperience";

export function PlatformLogin() {
  const settings = usePlatformSettings();
  return (
    <div className="min-h-dvh px-4 py-8 sm:px-8" style={{ backgroundColor: settings.backgroundColor }}>
      <div className="mx-auto max-w-[1020px]">
        <header className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ backgroundColor: settings.primaryColor }}>
              <Scissors className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">{settings.brandName}</p>
              <p className="text-xs text-slate-500">Atelier management</p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">
            <Sparkles className="size-3.5" style={{ color: settings.accentColor }} />
            Version {settings.appVersion}
          </span>
        </header>
        <section className="mb-5 rounded-2xl px-6 py-6 text-white shadow-md sm:px-8" style={{ background: `linear-gradient(120deg, ${settings.primaryColor}, ${settings.accentColor})` }}>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/75">Your atelier, in sync</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{settings.loginHeading}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">{settings.loginDescription}</p>
        </section>
        <LoginPage />
        <footer className="mt-4 text-center text-xs text-slate-500">{settings.loginFooter}</footer>
        {settings.releaseNotes && (
          <p className="mx-auto mt-3 max-w-[600px] text-center text-xs leading-relaxed text-slate-400" aria-label="Latest release notes">
            {settings.appVersion}: {settings.releaseNotes}
          </p>
        )}
      </div>
    </div>
  );
}
