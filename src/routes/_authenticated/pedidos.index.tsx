import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, WhatsBadge } from "@/components/StatusBadge";
import { brl, dateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({ meta: [{ title: "Pedidos — DoraFacilities APP" }, { name: "description", content: "Consultar e gerenciar pedidos da Dora Facilities." }, { property: "og:title", content: "Pedidos — DoraFacilities APP" }, { property: "og:description", content: "Consultar e gerenciar pedidos da Dora Facilities." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("todos");

  const q = useQuery({
    queryKey: ["orders", from, to, status],
    queryFn: async () => {
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(300);
      if (from) query = query.gte("created_at", new Date(`${from}T00:00:00`).toISOString());
      if (to) query = query.lte("created_at", new Date(`${to}T23:59:59.999`).toISOString());
      if (status !== "todos") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell
      title="Pedidos"
      action={
        <Button asChild size="lg">
          <Link to="/pedidos/novo"><Plus className="h-5 w-5" /> Novo</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="text-xs font-medium text-muted-foreground">
          De
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-11" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Até
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 h-11" />
        </label>
        <label className="col-span-2 text-xs font-medium text-muted-foreground sm:col-span-1">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground">
            <option value="todos">Todos</option>
            <option value="aberto">Aberto</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {q.isLoading && <p className="py-8 text-center text-muted-foreground">Carregando...</p>}
        {q.data?.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Nenhum pedido encontrado.
          </div>
        )}
        {q.data?.map((o) => (
          <Link key={o.id} to="/pedidos/$id" params={{ id: o.id }} className="block rounded-xl border bg-card p-4 active:bg-accent">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">#{o.number} · {o.customer_name}</p>
                <p className="text-sm text-muted-foreground">{dateTimeBR(o.created_at)}</p>
              </div>
              <p className="text-lg font-bold">{brl(o.total)}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge status={o.status} />
              <WhatsBadge status={o.whatsapp_status} />
              <span className="ml-auto text-muted-foreground">Lucro {brl(o.profit)}</span>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
