export type ReportItem = {
  product_id?: string | null;
  product_name: string;
  description?: string;
  unit: string;
  quantity: number;
  subtotal: number;
  subtotal_cost: number;
};

export type ReportOrder = {
  id?: string;
  number?: number;
  created_at: string;
  customer_name?: string;
  total: number;
  total_cost: number;
  profit: number;
  order_items: ReportItem[];
};

export type ProductStat = { name: string; description: string; unit: string; quantity: number; revenue: number; profit: number };
export type CategoryStat = { category: string; revenue: number; cost: number; profit: number; margin: number };
export type OrderRow = { id: string; number: number | null; day: string; customer: string; total: number; cost: number; profit: number; margin: number };

/** Variação percentual em relação ao período anterior; null quando não há base de comparação. */
export function variationPct(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function buildReport(orders: ReportOrder[], categories?: Map<string, string>) {
  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const cost = orders.reduce((s, o) => s + Number(o.total_cost), 0);
  const profit = revenue - cost;
  const byProduct = new Map<string, ProductStat>();
  const byDay = new Map<string, { day: string; orders: number; revenue: number; profit: number }>();
  const byCategory = new Map<string, { category: string; revenue: number; cost: number; profit: number }>();
  const zeroCost = new Map<string, { name: string; description: string; unit: string }>();
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  for (const o of orders) {
    const day = dayFmt.format(new Date(o.created_at));
    const d = byDay.get(day) ?? { day, orders: 0, revenue: 0, profit: 0 };
    d.orders += 1;
    d.revenue += Number(o.total);
    d.profit += Number(o.profit);
    byDay.set(day, d);
    for (const it of o.order_items) {
      const key = `${it.product_name}|${it.unit}|${it.description ?? ""}`;
      const p = byProduct.get(key) ?? { name: it.product_name, description: it.description ?? "", unit: it.unit, quantity: 0, revenue: 0, profit: 0 };
      p.quantity += Number(it.quantity);
      p.revenue += Number(it.subtotal);
      p.profit += Number(it.subtotal) - Number(it.subtotal_cost);
      byProduct.set(key, p);
      const category = (it.product_id && categories?.get(it.product_id)) || "Sem categoria";
      const c = byCategory.get(category) ?? { category, revenue: 0, cost: 0, profit: 0 };
      c.revenue += Number(it.subtotal);
      c.cost += Number(it.subtotal_cost);
      c.profit += Number(it.subtotal) - Number(it.subtotal_cost);
      byCategory.set(category, c);
      if (Number(it.subtotal_cost) === 0 && Number(it.quantity) > 0 && !zeroCost.has(key)) {
        zeroCost.set(key, { name: it.product_name, description: it.description ?? "", unit: it.unit });
      }
    }
  }
  const products = [...byProduct.values()];
  const orderRows: OrderRow[] = [...orders]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((o) => ({
      id: o.id ?? "",
      number: o.number ?? null,
      day: dayFmt.format(new Date(o.created_at)),
      customer: o.customer_name ?? "",
      total: Number(o.total),
      cost: Number(o.total_cost),
      profit: Number(o.profit),
      margin: Number(o.total) > 0 ? (Number(o.profit) / Number(o.total)) * 100 : 0,
    }));
  return {
    count: orders.length,
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    allProducts: [...products].sort((a, b) => b.revenue - a.revenue),
    topSold: [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    topProfit: [...products].sort((a, b) => b.profit - a.profit).slice(0, 10),
    days: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
    categories: [...byCategory.values()]
      .map((c) => ({ ...c, margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue),
    zeroCost: [...zeroCost.values()],
    orders: orderRows,
  };
}
export type Report = ReturnType<typeof buildReport>;
