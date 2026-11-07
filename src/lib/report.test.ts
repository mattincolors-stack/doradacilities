import { describe, expect, it } from "vitest";
import { buildReport, variationPct, type ReportOrder } from "./report";

const mk = (over: Partial<ReportOrder>, items: ReportOrder["order_items"]): ReportOrder => ({
  id: "o1",
  number: 1,
  created_at: "2026-11-01T12:00:00Z",
  customer_name: "Cliente",
  total: 10,
  total_cost: 6,
  profit: 4,
  order_items: items,
  ...over,
});

describe("Relatório", () => {
  it("calcula variação percentual em relação ao período anterior", () => {
    expect(variationPct(112, 100)).toBeCloseTo(12);
    expect(variationPct(90, 100)).toBeCloseTo(-10);
  });
  it("não calcula variação quando o período anterior é zero", () => {
    expect(variationPct(50, 0)).toBeNull();
    expect(variationPct(0, 0)).toBeNull();
  });
  it("agrupa lucro e margem por categoria", () => {
    const cats = new Map([
      ["p1", "Frutas"],
      ["p2", "Legumes"],
    ]);
    const r = buildReport(
      [
        mk({ id: "a" }, [{ product_id: "p1", product_name: "Banana", unit: "kg", quantity: 1, subtotal: 10, subtotal_cost: 6 }]),
        mk({ id: "b", created_at: "2026-11-02T12:00:00Z", total: 20, total_cost: 10, profit: 10 }, [{ product_id: "p2", product_name: "Tomate", unit: "kg", quantity: 2, subtotal: 20, subtotal_cost: 10 }]),
      ],
      cats,
    );
    const frutas = r.categories.find((c) => c.category === "Frutas");
    expect(frutas?.revenue).toBe(10);
    expect(frutas?.profit).toBe(4);
    expect(frutas?.margin).toBeCloseTo(40);
    expect(r.categories.find((c) => c.category === "Legumes")?.margin).toBeCloseTo(50);
  });
  it("usa 'Sem categoria' quando o produto não existe mais", () => {
    const r = buildReport([mk({}, [{ product_id: "gone", product_name: "X", unit: "un", quantity: 1, subtotal: 10, subtotal_cost: 6 }])], new Map());
    expect(r.categories[0]?.category).toBe("Sem categoria");
  });
  it("alerta produtos vendidos com custo zerado", () => {
    const r = buildReport([
      mk({ total_cost: 0, profit: 10 }, [{ product_id: "p1", product_name: "Sem custo", description: "Mix", unit: "un", quantity: 1, subtotal: 10, subtotal_cost: 0 }]),
    ]);
    expect(r.zeroCost.map((z) => z.name)).toEqual(["Sem custo"]);
  });
  it("lista pedidos do período com margem, do mais recente ao mais antigo", () => {
    const r = buildReport([
      mk({ id: "a", created_at: "2026-11-01T12:00:00Z" }, []),
      mk({ id: "b", number: 2, created_at: "2026-11-03T12:00:00Z", total: 20, total_cost: 10, profit: 10 }, []),
    ]);
    expect(r.orders[0]).toMatchObject({ id: "b", customer: "Cliente", total: 20, cost: 10, profit: 10 });
    expect(r.orders[0]?.margin).toBeCloseTo(50);
    expect(r.orders[1]?.margin).toBeCloseTo(40);
  });
});

describe("Relatório — custo e categoria", () => {
  it("soma custo e lucro do produto com custo zerado no total", () => {
    const r = buildReport([mk({ total: 10, total_cost: 0, profit: 10 }, [{ product_id: "p1", product_name: "Kiwi", unit: "kg", quantity: 1, subtotal: 10, subtotal_cost: 0 }])], new Map([["p1", "Frutas"]]));
    expect(r.zeroCost).toHaveLength(1);
    expect(r.categories[0]).toMatchObject({ category: "Frutas", cost: 0, profit: 10 });
    expect(r.margin).toBe(100);
  });
  it("não alerta itens com custo preenchido", () => {
    expect(buildReport([mk({}, [{ product_name: "Banana", unit: "kg", quantity: 1, subtotal: 10, subtotal_cost: 6 }])]).zeroCost).toEqual([]);
  });
});
