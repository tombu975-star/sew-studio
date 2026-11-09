"use client";

import Image from "next/image";
import { Scissors, Sparkles } from "lucide-react";
import { LoginPage } from "@/components/atelier/LoginPage";
import { usePlatformSettings } from "@/components/atelier/PlatformExperience";

export function PlatformLogin() {
  const settings = usePlatformSettings();
  return (
    <main
      className="h-dvh overflow-hidden bg-[#f5f0e9] p-0 text-[#292321] sm:h-auto sm:min-h-dvh sm:overflow-visible sm:p-4 lg:p-6"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      <div className="mx-auto grid h-full w-full max-w-[1440px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#fbfaf8] sm:h-auto sm:min-h-dvh sm:grid-rows-none sm:rounded-[24px] sm:shadow-[0_24px_80px_rgba(54,34,29,0.12)] lg:min-h-[calc(100dvh-48px)] lg:grid-cols-[1.05fr_.95fr]">
        <aside className="relative isolate overflow-hidden bg-[#42252d] sm:min-h-[340px] lg:min-h-[720px]">
          <Image
            src="/atelier-login.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 55vw"
            className="object-cover object-[center_38%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#21171a]/55 via-[#392027]/10 to-[#21171a]/75" />
          <div className="relative z-10 flex flex-col justify-between px-5 py-4 [@media(max-height:700px)]:py-3 text-white sm:min-h-[340px] sm:p-9 lg:min-h-[720px] lg:p-12">
            <header className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/15 backdrop-blur-md">
                  <Scissors className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-wide">{settings.brandName}</p>
                  <p className="text-xs text-white/75">Atelier management</p>
                </div>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full border border-white/25 bg-black/15 px-3 py-1.5 text-xs text-white/90 backdrop-blur sm:inline-flex">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Version {settings.appVersion}
              </span>
            </header>

            <div className="hidden max-w-[540px] pt-10 sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                Made for the art of making
              </p>
              <h1 className="mt-3 font-serif text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                {settings.loginHeading}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
                {settings.loginDescription}
              </p>
              <div className="mt-8 hidden items-center gap-3 text-xs tracking-wide text-white/80 sm:flex">
                <span className="h-px w-9 bg-white/55" />
                Thoughtfully made for your everyday craft
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 overflow-y-auto px-6 py-5 [@media(max-height:700px)]:py-3 sm:overflow-visible sm:px-10 sm:py-12 lg:px-12 xl:px-[72px]">
          <div className="m-auto w-full max-w-[420px]">
            <LoginPage />
            <footer className="mt-4 text-center text-xs leading-relaxed text-[#8b7f78] [@media(max-height:700px)]:hidden sm:mt-8">
              <p>{settings.loginFooter}</p>
              {settings.releaseNotes && (
                <p className="mx-auto mt-2 hidden max-w-[360px] sm:block" aria-label="Latest release notes">
                  Version {settings.appVersion}: {settings.releaseNotes}
                </p>
              )}
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
