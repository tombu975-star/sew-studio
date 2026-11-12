"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { BrandLogo, BrandMark } from "@/components/atelier/BrandMark";
import { LoginPage } from "@/components/atelier/LoginPage";
import { usePlatformSettings } from "@/components/atelier/PlatformExperience";

export function PlatformLogin({
  children,
  eyebrow,
  heading,
  description,
  subtitle,
  tagline,
}: {
  children?: React.ReactNode;
  eyebrow?: string;
  heading?: string;
  description?: string;
  subtitle?: string;
  tagline?: string;
} = {}) {
  const settings = usePlatformSettings();
  return (
    <main
      className="min-h-dvh overflow-x-hidden bg-[#5C1626] p-0 text-[#2F151B] sm:bg-[var(--login-bg)] sm:p-3 md:p-4 lg:p-6"
      style={{ "--login-bg": settings.backgroundColor } as React.CSSProperties}
    >
      <div className="mx-auto grid min-h-dvh w-full max-w-[1440px] grid-cols-1 overflow-hidden bg-[#5C1626] sm:min-h-[calc(100dvh-24px)] sm:rounded-[30px] sm:bg-[#fffdfc] sm:shadow-[0_30px_100px_rgba(57,16,25,0.18)] sm:ring-1 sm:ring-white/70 md:min-h-[calc(100dvh-32px)] md:grid-cols-[minmax(0,1.02fr)_minmax(0,.98fr)] lg:min-h-[calc(100dvh-48px)] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:rounded-[30px]">
        <aside className="relative isolate h-[30dvh] max-h-[320px] min-h-[180px] overflow-hidden bg-[#3B0010] [@media(min-height:760px)]:h-[34dvh] sm:max-h-[360px] sm:min-h-[260px] md:h-auto md:max-h-none md:min-h-[620px] lg:min-h-[720px]">
          <Image
            src="/atelier-login.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 48vw, 55vw"
            className="object-cover object-[center_22%] sm:object-[center_38%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#230A10]/55 via-[#3B0010]/10 to-[#230A10]/75 max-sm:hidden" />
          {/* Phones: red-tinted photo that melts into the panel, like the reference */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#3D101A]/45 via-[#5C1626]/55 to-[#5C1626] sm:hidden" />
          <svg
            aria-hidden="true"
            viewBox="0 0 390 64"
            preserveAspectRatio="none"
            className="absolute -bottom-px left-0 z-[5] h-9 w-full sm:hidden"
          >
            <path d="M0 64V30C58 6 128 -2 196 14c66 16 130 34 194 2V64Z" fill="#5C1626" />
          </svg>
          <div className="relative z-10 flex h-full flex-col justify-between px-5 py-4 [@media(max-height:700px)]:py-3 text-white sm:min-h-[260px] sm:p-8 md:min-h-[620px] md:p-8 lg:min-h-[720px] lg:p-12">
            <header className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white shadow-[0_4px_14px_rgba(49,10,19,0.25)]">
                  <BrandMark size={36} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-wide">{settings.brandName}</p>
                  <p className="text-xs text-white/75">{subtitle ?? "Atelier management"}</p>
                </div>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full border border-white/25 bg-black/15 px-3 py-1.5 text-xs text-white/90 backdrop-blur sm:inline-flex">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Version {settings.appVersion}
              </span>
            </header>

            <div className="hidden max-w-[540px] pt-10 sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                {eyebrow ?? "Made for the art of making"}
              </p>
              <h1 className="mt-3 font-serif text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                {heading ?? settings.loginHeading}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
                {description ?? settings.loginDescription}
              </p>
              <div className="mt-8 hidden items-center gap-3 text-xs tracking-wide text-white/80 sm:flex">
                <span className="h-px w-9 bg-white/55" />
                {tagline ?? "Thoughtfully made for your everyday craft"}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-[560px] overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 text-white sm:min-h-[560px] sm:px-8 sm:py-10 sm:text-inherit md:min-h-[620px] md:px-8 md:py-10 lg:px-12 lg:py-14 xl:px-[76px]">
          <div className="m-auto w-full max-w-[480px] py-2">
            <div className="mb-3 hidden sm:block">
              <BrandLogo width={168} />
            </div>
            {children ?? <LoginPage />}
            <footer className="mt-4 text-center text-xs leading-relaxed text-white/70 [@media(max-height:700px)]:hidden sm:mt-8 sm:text-[#897076]">
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
