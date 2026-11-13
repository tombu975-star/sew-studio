/**
 * PostCSS config (CommonJS so Node doesn't need to re-parse it as ESM).
 * Tailwind CSS v4 moved its PostCSS plugin to `@tailwindcss/postcss`;
 * referencing `tailwindcss` directly fails the build.
 * Kept in sync with postcss.config.mjs — whichever one the toolchain
 * picks up resolves to the same, valid plugin.
 */
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};