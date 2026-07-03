/**
 * Tailwind v4 PostCSS config — new in V2-1.
 *
 * This codebase had no Tailwind pipeline at all before now: `package.json`
 * lists no `tailwindcss`/`@tailwindcss/postcss` dependency, and there was no
 * postcss.config anywhere. src/app/globals.css already uses Tailwind v4's
 * `@import "tailwindcss"` + `@theme` syntax (carried over from the SPA's
 * index.css) rather than a `tailwind.config.ts` — the V2 architecture doc's
 * instruction to reconcile tokens "in tailwind.config.ts" describes Tailwind
 * v3's config shape, which doesn't match what's actually here. Followed the
 * code, not the doc: v4's CSS-native `@theme` block is where the tokens live
 * (see globals.css), and this file is the only wiring v4 needs on the
 * PostCSS side.
 *
 * Run before this builds: `npm install -D tailwindcss @tailwindcss/postcss`
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
