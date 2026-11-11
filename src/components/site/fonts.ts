import localFont from "next/font/local";

// Two weights each keeps the page light for visitors on mobile data.
export const serif = localFont({
  src: [
    { path: "../../fonts/cormorant-garamond/cormorant-garamond-latin-500-normal.woff2", weight: "500" },
    { path: "../../fonts/cormorant-garamond/cormorant-garamond-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-serif",
  display: "swap",
});

export const sans = localFont({
  src: [
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-400-normal.woff2", weight: "400" },
    { path: "../../fonts/plus-jakarta-sans/plus-jakarta-sans-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-sans-site",
  display: "swap",
});
