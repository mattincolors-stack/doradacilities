// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [VitePWA({
      strategies: "generateSW", filename: "sw.js", registerType: "autoUpdate",
      injectRegister: null, manifest: false, devOptions: { enabled: false },
      includeAssets: ["offline.html", "manifest.json", "icons/*.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,png,ico,woff2}"],
        navigateFallback: "/offline.html", navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/_serverFn\//],
        runtimeCaching: [
          { urlPattern: ({ request, url }) => request.mode === "navigate" && !/^\/(~oauth|api|_serverFn)/.test(url.pathname), handler: "NetworkFirst", options: { cacheName: "dora-navigation", networkTimeoutSeconds: 5, cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 8 } } },
          { urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/.*[-.][A-Za-z0-9_-]{8,}\.(js|css|woff2)$/.test(url.pathname), handler: "CacheFirst", options: { cacheName: "dora-assets", expiration: { maxEntries: 150 } } }
        ]
      }
    })]
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
