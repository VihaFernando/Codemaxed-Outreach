// @lovable.dev/vite-tanstack-config already includes the following  do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Netlify is serving this project as a static SPA via netlify.toml redirects.
  // Running Nitro's Netlify preset here triggers an extra SSR packaging step that
  // currently fails on Netlify after the client build has already succeeded.
  nitro: false,
  tanstackStart: {
    prerender: {
      enabled: true,
      crawlLinks: true,
    },
    server: { entry: "server" },
  },
});
