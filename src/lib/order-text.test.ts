import { describe, expect, it } from "vitest";
import { buildThermalTicket, buildWhatsappMessage, type TicketOrder } from "./order-text";
import { brl } from "./format";

const order: TicketOrder = {
  number: 42,
  created_at: "2026-10-29T18:00:00Z",
  customer_name: "João Conceição",
  customer_phone: "16 99999-0000",
  notes: "Entregar após às 14h, portão azul",
  total: 1234.5,
  items: [
    { product_name: "Maçã Fuji selecionada extra grande", unit: "kg", quantity: 2.5, subtotal: 25 },
    { product_name: "Alface", unit: "maço", quantity: 3, subtotal: 9.5 },
  ],
};

describe("brl", () => {
  it("formats Brazilian currency", () => {
    expect(brl(1234.5)).toBe("R$ 1.234,50");
    expect(brl(0)).toBe("R$ 0,00");
  });
});

describe.each([32, 48] as const)("thermal ticket %i cols", (width) => {
  const txt = buildThermalTicket(order, { width });
  it("never exceeds the column width", () => {
    for (const line of txt.split("\n")) expect(line.length).toBeLessThanOrEqual(width);
  });
  it("is plain ASCII without accents", () => {
    expect(/^[\x20-\x7E\n]*$/.test(txt)).toBe(true);
    expect(txt).toContain("Joao Conceicao");
  });
  it("has header, number, total and footer", () => {
    expect(txt.split("\n")[0].trim()).toBe("DORA FACILITIES");
    expect(txt).toContain("PEDIDO #42");
    expect(txt).toMatch(/TOTAL\s+R\$ 1\.234,50/);
    expect(txt).toContain("Obrigado pela preferencia!");
  });
  it("never includes cost or profit", () => {
    expect(txt.toLowerCase()).not.toMatch(/custo|lucro/);
  });
});

describe("whatsapp message", () => {
  it("has number, customer, items and total, without cost", () => {
    const m = buildWhatsappMessage(order);
    expect(m).toContain("Pedido #42");
    expect(m).toContain("João Conceição");
    expect(m).toContain("3 maço x Alface = R$ 9,50");
    expect(m).toContain("R$ 1.234,50");
    expect(m.toLowerCase()).not.toMatch(/custo|lucro/);
  });
});
