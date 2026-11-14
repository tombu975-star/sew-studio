import { useSyncExternalStore } from "react";

/** Below this width (tablets and phones) data-entry forms open as a pop-up. At and above it, forms sit on the page with the table. */
export const POPUP_BELOW = 1024;
const query = `(max-width: ${POPUP_BELOW - 1}px)`;

function subscribe(cb: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

export type FormMode = "popup" | "inline";
export function useFormMode(): FormMode {
  return useSyncExternalStore(subscribe, () => (window.matchMedia(query).matches ? "popup" : "inline"), () => "inline");
}
