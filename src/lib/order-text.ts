import { brl, dateTimeBR, qty } from "./format";

export type TicketItem = { product_name: string; description?: string; unit: string; quantity: number; subtotal: number };
export type TicketOrder = {
  number: number;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  notes: string;
  total: number;
  items: TicketItem[];
};

/** Plain printable ASCII only (no accents, no emoji). */
export function toAscii(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function wrap(text: string, w: number): string[] {
  const out: string[] = [];
  let line = "";
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > w) {
      if (line) {
        out.push(line);
        line = "";
      }
      out.push(word.slice(0, w));
      word = word.slice(w);
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= w) line += " " + word;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

function center(s: string, w: number): string {
  const t = s.slice(0, w);
  return " ".repeat(Math.floor((w - t.length) / 2)) + t;
}

function leftRight(l: string, r: string, w: number): string[] {
  if (l.length + 1 + r.length <= w) return [l + " ".repeat(w - l.length - r.length) + r];
  const lines = wrap(l, w);
  const last = lines[lines.length - 1] ?? "";
  if (last.length + 1 + r.length <= w) {
    lines[lines.length - 1] = last + " ".repeat(w - last.length - r.length) + r;
  } else {
    lines.push(" ".repeat(Math.max(0, w - r.length)) + r);
  }
  return lines;
}

function itemLabel(it: TicketItem): string {
  const u = it.unit === "un" ? "" : ` ${it.unit}`;
  return `${qty(it.quantity)}${u} x ${it.product_name}`;
}

/** Thermal printer ticket. Never includes cost or profit. */
export function buildThermalTicket(
  o: TicketOrder,
  opts: { width: 32 | 48; company?: string },
): string {
  const w = opts.width;
  const sep = "-".repeat(w);
  const L: string[] = [];
  const push = (...lines: string[]) => L.push(...lines.map((x) => toAscii(x)));
  push(center(toAscii(opts.company || "Dora Facilities").toUpperCase(), w));
  push(sep);
  push(...leftRight(`PEDIDO #${o.number}`, dateTimeBR(o.created_at), w));
  push(...wrap(toAscii(`CLIENTE: ${o.customer_name}`), w));
  if (o.customer_phone) push(...wrap(toAscii(`TEL: ${o.customer_phone}`), w));
  push(sep);
  for (const it of o.items) push(...leftRight(toAscii(itemLabel(it)), brl(it.subtotal), w));
  push(sep);
  push(...leftRight("TOTAL", brl(o.total), w));
  if (o.notes?.trim()) {
    push(sep);
    push(...wrap(toAscii(`OBS: ${o.notes.trim()}`), w));
  }
  push(sep);
  push(center("Obrigado pela preferencia!", w));
  push("", "", "");
  return L.map((l) => l.slice(0, w).replace(/\s+$/, "")).join("\n");
}

/** WhatsApp summary. Never includes cost or profit. */
export function buildWhatsappMessage(o: TicketOrder, company = "Dora Facilities"): string {
  const lines = [
    `*Pedido #${o.number} - ${company}*`,
    `Data: ${dateTimeBR(o.created_at)}`,
    `Cliente: ${o.customer_name}${o.customer_phone ? ` (${o.customer_phone})` : ""}`,
    "",
    "*Itens:*",
    ...o.items.map((it) => `- ${itemLabel(it)} = ${brl(it.subtotal)}${it.description ? `\n  ${it.description}` : ""}`),
    "",
    `*Total: ${brl(o.total)}*`,
  ];
  if (o.notes?.trim()) lines.push(`Obs: ${o.notes.trim()}`);
  return lines.join("\n");
}
