"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface PlatformSettings {
  appVersion: string;
  releaseNotes: string;
  brandName: string;
  loginHeading: string;
  loginDescription: string;
  loginFooter: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  appVersion: "0.2.1",
  releaseNotes: "",
  brandName: "Sewsiness",
  loginHeading: "Welcome back",
  loginDescription: "Sign in to manage your studio’s customers, orders and daily work.",
  loginFooter: "Sewsiness · Atelier management system",
  primaryColor: "#650019",
  accentColor: "#800020",
  backgroundColor: "#F9F2F4",
};

const PlatformSettingsContext = createContext<PlatformSettings>(DEFAULT_SETTINGS);
export const usePlatformSettings = () => useContext(PlatformSettingsContext);

export function PlatformExperience({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    fetch("/api/platform-settings", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load platform settings");
        return response.json() as Promise<PlatformSettings>;
      })
      .then((next) => {
        if (!active || !next) return;
        setSettings({ ...DEFAULT_SETTINGS, ...next });
        const root = document.documentElement;
        root.style.setProperty("--primary", next.primaryColor || DEFAULT_SETTINGS.primaryColor);
        root.style.setProperty("--accent-foreground", next.accentColor || DEFAULT_SETTINGS.accentColor);
        root.style.setProperty("--ring", next.primaryColor || DEFAULT_SETTINGS.primaryColor);
        root.style.setProperty("--background", next.backgroundColor || DEFAULT_SETTINGS.backgroundColor);
        root.dataset.appVersion = next.appVersion || DEFAULT_SETTINGS.appVersion;
        document.title = next.brandName || DEFAULT_SETTINGS.brandName;
      })
      .catch(() => {
        // Presentation settings are optional; keep the built-in theme if the
        // database is temporarily unavailable rather than blocking sign-in.
      });
    return () => { active = false; };
  }, []);

  return (
    <PlatformSettingsContext.Provider value={settings}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}
