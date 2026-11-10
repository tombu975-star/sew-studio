#!/usr/bin/env node
/**
 * Builds every browser/app icon from ONE source logo.
 *
 *   1. Save the official Sewiness logo as  public/brand/sewiness-logo.svg
 *      (or .png / .webp / .jpg — a square, at least 512x512 for raster files).
 *   2. Run:  npm run icons          (or:  node scripts/generate-icons.mjs path/to/logo.png)
 *
 * Writes: public/favicon-16.png, favicon-32.png, apple-touch-icon.png,
 * icon-192.png, icon-512.png, icon-maskable-512.png and public/logo.svg.
 * Then hard-refresh the browser (Ctrl+Shift+R) — favicons are cached aggressively.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const candidates = ["svg", "png", "webp", "jpg", "jpeg"].map((e) => path.join(pub, "brand", `sewiness-logo.${e}`));
const source = process.argv[2] ? path.resolve(process.argv[2]) : candidates.find((p) => fs.existsSync(p));
if (!source || !fs.existsSync(source)) {
  console.error("No logo found. Save it as public/brand/sewiness-logo.svg (or .png) or pass a path.");
  process.exit(1);
}
const isSvg = source.toLowerCase().endsWith(".svg");
const input = () => sharp(source, isSvg ? { density: 512 } : {});
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function icon(size, file, { pad = 0, bg = CLEAR } = {}) {
  const inner = Math.max(1, Math.round(size * (1 - pad * 2)));
  const logo = await input().resize(inner, inner, { fit: "contain", background: CLEAR }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(pub, file));
  console.log("wrote", file);
}

await icon(16, "favicon-16.png");
await icon(32, "favicon-32.png");
await icon(180, "apple-touch-icon.png", { pad: 0.1, bg: WHITE });
await icon(192, "icon-192.png");
await icon(512, "icon-512.png");
await icon(512, "icon-maskable-512.png", { pad: 0.2, bg: WHITE }); // safe zone for Android masks

// public/logo.svg is also referenced as an icon: copy an SVG source, or wrap a raster one.
if (isSvg) {
  fs.copyFileSync(source, path.join(pub, "logo.svg"));
} else {
  // 192px keeps this tab-icon file small (it loads on every page).
  const png = await input().resize(192, 192, { fit: "contain", background: CLEAR }).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(
    path.join(pub, "logo.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><image width="192" height="192" href="data:image/png;base64,${png.toString("base64")}"/></svg>`
  );
}
console.log("wrote logo.svg");
