import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DoraFacilities APP — Pedidos e produtos" },
      { name: "description", content: "Gestão de produtos, pedidos e relatórios da Dora Facilities." },
      { property: "og:title", content: "DoraFacilities APP — Pedidos e produtos" },
      { property: "og:description", content: "Gestão de produtos, pedidos e relatórios da Dora Facilities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/pedidos" });
  },
});
