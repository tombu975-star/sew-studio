"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/stores/auth";

/** Minutes of no mouse/keyboard/touch activity before auto sign-out. */
export const IDLE_TIMEOUT_MINUTES = 20;
/** Warn this many seconds before actually signing out. */
const WARNING_BEFORE_SECONDS = 60;

const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;
const WARNING_BEFORE_MS = WARNING_BEFORE_SECONDS * 1000;
const CHECK_INTERVAL_MS = 5_000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
] as const;

/**
 * Signs the user out after a period of inactivity — required for TVET/MIS
 * data-protection expectations around unattended sessions on shared
 * computers. Only runs while `enabled` (i.e. while authenticated); the
 * existing logout() call already clears the session cookie and drops the
 * client back to the login screen.
 */
export function useIdleLogout(enabled: boolean) {
  const lastActivity = useRef(Date.now());
  const warned = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    lastActivity.current = Date.now();
    warned.current = false;

    const markActive = () => {
      lastActivity.current = Date.now();
      warned.current = false;
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, markActive, { passive: true }),
    );

    const interval = setInterval(() => {
      const idleForMs = Date.now() - lastActivity.current;

      if (idleForMs >= IDLE_TIMEOUT_MS) {
        clearInterval(interval);
        toast.info("You've been signed out due to inactivity.");
        useAuth.getState().logout();
        return;
      }

      if (!warned.current && idleForMs >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS) {
        warned.current = true;
        toast.warning(
          `You'll be signed out in ${WARNING_BEFORE_SECONDS} seconds due to inactivity — move your mouse or press a key to stay signed in.`,
        );
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, markActive),
      );
      clearInterval(interval);
    };
  }, [enabled]);
}
