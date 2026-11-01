import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, MessageCircle, RotateCcw, Share2, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProductPhoto } from "@/components/ProductPhoto";
import { StatusBadge, WhatsBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { orderQuery, settingsQuery } from "@/lib/queries";
import { brl, dateTimeBR, digits, qty } from "@/lib/format";
import { buildThermalTicket, buildWhatsappMessage } from "@/lib/order-text";
import { downloadBlob, shareFile } from "@/lib/files";
import { getWhatsappConfig, sendOrderWhatsapp } from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({ meta: [{ title: "Pedido — DoraFacilities APP" }, { name: "description", content: "Detalhes do pedido, WhatsApp e impressão da Dora Facilities." }, { property: "og:title", content: "Pedido — DoraFacilities APP" }, { property: "og:description", content: "Detalhes do pedido, WhatsApp e impressão da Dora Facilities." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const order = useQuery(orderQuery(id));
  const settings = useQuery(settingsQuery);
  const getConfig = useServerFn(getWhatsappConfig);
  const send = useServerFn(sendOrderWhatsapp);
  const config = useQuery({ queryKey: ["wa-config"], queryFn: () => getConfig() });
  const [busy, setBusy] = useState(false);

  if (order.isLoading) return <AppShell title="Pedido"><p className="py-8 text-center text-muted-foreground">Carregando...</p></AppShell>;
  if (!order.data) return <AppShell title="Pedido"><p className="py-8 text-center">Pedido não encontrado.</p></AppShell>;
  const o = order.data;
  const company = settings.data?.company_name ?? "Dora Facilities";
  const ticketData = { ...o, items: o.order_items };
  const waText = buildWhatsappMessage(ticketData, company);
  const waLink = `https://wa.me/${digits(settings.data?.whatsapp_number ?? "5516995757737")}?text=${encodeURIComponent(waText)}`;
  const fileName = `pedido-${o.number}.txt`;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  async function setStatus(status: "aberto" | "finalizado" | "cancelado") {
    if (status === "cancelado" && !confirm("Cancelar este pedido?")) return;
    const { error } = await supabase
      .from("orders")
      .update({ status, finalized_at: status === "finalizado" ? new Date().toISOString() : status === "aberto" ? null : o.finalized_at })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "aberto" ? "Pedido reaberto" : status === "cancelado" ? "Pedido cancelado" : "Pedido finalizado");
    refresh();
  }

  async function resend() {
    setBusy(true);
    try {
      const r = await send({ data: { orderId: id } });
      if (r.status === "enviado") toast.success("Enviado para o WhatsApp");
      else toast.error("Falha ao enviar. Veja o motivo abaixo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function markManual() {
    await supabase
      .from("orders")
      .update({ whatsapp_status: "enviado", whatsapp_error: "Enviado manualmente pelo link wa.me", whatsapp_sent_at: new Date().toISOString() })
      .eq("id", id);
    refresh();
  }

  function txtBlob() {
    const width = (settings.data?.txt_width === 48 ? 48 : 32) as 32 | 48;
    return new Blob([buildThermalTicket(ticketData, { width, company })], { type: "text/plain;charset=utf-8" });
  }

  return (
    <AppShell
      title={`Pedido #${o.number}`}
      action={
        <Button asChild variant="ghost" size="sm">
          <Link to="/pedidos"><ArrowLeft className="h-4 w-4" /> Pedidos</Link>
        </Button>
      }
    >
      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={o.status} />
          <WhatsBadge status={o.whatsapp_status} />
          <span className="ml-auto text-sm text-muted-foreground">{dateTimeBR(o.created_at)}</span>
        </div>
        <p className="mt-3 text-lg font-bold">{o.customer_name}</p>
        {o.customer_phone && <p className="text-sm text-muted-foreground">{o.customer_phone}</p>}
        {o.notes && <p className="mt-2 rounded-lg bg-muted p-2 text-sm">Obs: {o.notes}</p>}
      </section>

      <section className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Vendido" value={brl(o.total)} />
        <Stat label="Custo" value={brl(o.total_cost)} />
        <Stat label="Lucro" value={brl(o.profit)} strong />
      </section>

      <section className="mt-3 space-y-2 rounded-xl border bg-card p-4">
        <h2 className="font-bold">Itens</h2>
        {o.order_items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 border-b pb-2 last:border-0">
            <ProductPhoto path={it.photo_url} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{it.product_name}</p>
              {it.description && <p className="text-xs text-muted-foreground">{it.description}</p>}
              <p className="text-xs text-muted-foreground">
                {qty(it.quantity)} {it.unit} × {brl(it.unit_price)} · custo {brl(it.unit_cost)}
              </p>
            </div>
            <p className="font-bold">{brl(it.subtotal)}</p>
          </div>
        ))}
      </section>

      <section className="mt-3 space-y-3 rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 font-bold"><MessageCircle className="h-5 w-5" /> WhatsApp da empresa</h2>
        {config.data && !config.data.configured && (
          <div className="flex gap-2 rounded-lg border border-warning bg-warning/15 p-3 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>O envio automático ainda não está configurado. Use o botão abaixo para abrir o WhatsApp com a mensagem pronta.</p>
          </div>
        )}
        {o.whatsapp_status === "enviado" && (
          <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Enviado {o.whatsapp_sent_at ? `em ${dateTimeBR(o.whatsapp_sent_at)}` : ""}</p>
        )}
        {o.whatsapp_error && <p className="text-xs text-muted-foreground">{o.whatsapp_error}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {config.data?.configured && (
            <Button size="lg" className="h-12" disabled={busy} onClick={resend}>
              <RotateCcw /> {o.whatsapp_status === "enviado" ? "Reenviar" : "Enviar agora"}
            </Button>
          )}
          <Button asChild size="lg" variant={config.data?.configured ? "outline" : "default"} className="h-12">
            <a href={waLink} target="_blank" rel="noreferrer" onClick={() => !config.data?.configured && markManual()}>
              <MessageCircle /> Abrir no WhatsApp
            </a>
          </Button>
        </div>
      </section>

      {o.status === "finalizado" && (
        <section className="mt-3 space-y-2 rounded-xl border bg-card p-4">
          <h2 className="font-bold">Imprimir/Exportar TXT</h2>
          <p className="text-xs text-muted-foreground">Texto puro, {settings.data?.txt_width ?? 32} colunas, sem custo nem lucro.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" variant="outline" className="h-12" onClick={() => downloadBlob(txtBlob(), fileName)}>
              <Download /> Baixar TXT
            </Button>
            <Button size="lg" variant="outline" className="h-12" onClick={() => shareFile(txtBlob(), fileName)}>
              <Share2 /> Compartilhar
            </Button>
          </div>
        </section>
      )}

      <section className="mt-3 grid grid-cols-2 gap-2">
        {o.status !== "aberto" && (
          <Button size="lg" variant="secondary" className="h-12" onClick={() => setStatus("aberto")}>
            <RotateCcw /> Reabrir
          </Button>
        )}
        {o.status === "aberto" && (
          <Button size="lg" className="h-12" onClick={() => setStatus("finalizado")}>
            <CheckCircle2 /> Finalizar
          </Button>
        )}
        {o.status !== "cancelado" && (
          <Button size="lg" variant="outline" className="h-12 text-destructive" onClick={() => setStatus("cancelado")}>
            <XCircle /> Cancelar
          </Button>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${strong ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-sm font-extrabold sm:text-base">{value}</p>
    </div>
  );
}
