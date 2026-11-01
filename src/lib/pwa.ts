export async function registerOffline() {
  if (!("serviceWorker" in navigator)) return;
  const hostname = window.location.hostname.toLowerCase();
  const previewLabel = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
  const platformHost = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(hostname);
  const refused = !import.meta.env.PROD || window.self !== window.top ||
    (platformHost && (previewLabel.test(hostname.split(".")[0] ?? "") || /^project--.+-dev\./.test(hostname))) ||
    /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(hostname) || new URLSearchParams(window.location.search).get("sw") === "off";
  if (refused) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(r => [r.active,r.waiting,r.installing].some(w => w && new URL(w.scriptURL).pathname === "/sw.js")).map(r => r.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}