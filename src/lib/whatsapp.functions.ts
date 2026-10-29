import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildWhatsappMessage } from "./order-text";

const GRAPH_URL = "https://graph.facebook.com/v21.0";

function configured() {
  return Boolean(process.env["WHATSAPP_ACCESS_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"]);
}

export const getWhatsappConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ configured: configured() }));

/** Sends the order summary via WhatsApp Cloud API and records the result on the order. */
export const sendOrderWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => {
    if (typeof d?.orderId !== "string" || !d.orderId) throw new Error("Pedido inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: isAdmin } = await sb.rpc("is_admin");
    if (!isAdmin) throw new Error("Acesso negado");
    if (!configured()) return { configured: false as const, status: "pendente" as const };

    const [{ data: order, error }, { data: settings }] = await Promise.all([
      sb.from("orders").select("*, order_items(*)").eq("id", data.orderId).single(),
      sb.from("settings").select("*").eq("id", 1).single(),
    ]);
    if (error || !order) throw new Error("Pedido não encontrado");

    const text = buildWhatsappMessage(
      { ...order, items: order.order_items },
      settings?.company_name ?? "Dora Facilities",
    );
    const to = (settings?.whatsapp_number ?? "5516995757737").replace(/\D/g, "");

    try {
      const res = await fetch(`${GRAPH_URL}/${process.env["WHATSAPP_PHONE_NUMBER_ID"]}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env["WHATSAPP_ACCESS_TOKEN"]}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
      });
      const body = await res.text();
      if (!res.ok) throw new Error(`WhatsApp respondeu ${res.status}: ${body.slice(0, 300)}`);
      await sb
        .from("orders")
        .update({ whatsapp_status: "enviado", whatsapp_error: null, whatsapp_sent_at: new Date().toISOString() })
        .eq("id", data.orderId);
      return { configured: true as const, status: "enviado" as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("WhatsApp send failed", msg);
      await sb.from("orders").update({ whatsapp_status: "falhou", whatsapp_error: msg }).eq("id", data.orderId);
      return { configured: true as const, status: "falhou" as const, error: msg };
    }
  });
