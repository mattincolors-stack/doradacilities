import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// After a server restart/redeploy, the browser may request page chunks that no
// longer exist. Reload once to fetch fresh ones instead of showing a blank screen.
if (typeof window !== "undefined" && !(window as any).__chunkReloadHooked) {
  (window as any).__chunkReloadHooked = true;
  const KEY = "chunk-reload-at";
  const reloadOnce = ((window as any).__chunkReload = () => {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 10000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  });
  window.addEventListener("vite:preloadError", (e) => { e.preventDefault(); reloadOnce(); });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = String((e.reason as Error)?.message ?? e.reason ?? "");
    if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)) reloadOnce();
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultOnCatch: (err: unknown) => {
      if (/dynamically imported module|Importing a module script failed/i.test(String((err as Error)?.message ?? ""))) (window as any).__chunkReload?.();
    },
  });

  return router;
};
