export type ReportOrder = {
  created_at: string;
  total: number;
  total_cost: number;
  profit: number;
  order_items: { product_name: string; unit: string; quantity: number; subtotal: number; subtotal_cost: number }[];
};

export type ProductStat = { name: string; unit: string; quantity: number; revenue: number; profit: number };

export function buildReport(orders: ReportOrder[]) {
  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const cost = orders.reduce((s, o) => s + Number(o.total_cost), 0);
  const profit = revenue - cost;
  const byProduct = new Map<string, ProductStat>();
  const byDay = new Map<string, { day: string; orders: number; revenue: number; profit: number }>();
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  for (const o of orders) {
    const day = dayFmt.format(new Date(o.created_at));
    const d = byDay.get(day) ?? { day, orders: 0, revenue: 0, profit: 0 };
    d.orders += 1;
    d.revenue += Number(o.total);
    d.profit += Number(o.profit);
    byDay.set(day, d);
    for (const it of o.order_items) {
      const key = `${it.product_name}|${it.unit}`;
      const p = byProduct.get(key) ?? { name: it.product_name, unit: it.unit, quantity: 0, revenue: 0, profit: 0 };
      p.quantity += Number(it.quantity);
      p.revenue += Number(it.subtotal);
      p.profit += Number(it.subtotal) - Number(it.subtotal_cost);
      byProduct.set(key, p);
    }
  }
  const products = [...byProduct.values()];
  return {
    count: orders.length,
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    topSold: [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    topProfit: [...products].sort((a, b) => b.profit - a.profit).slice(0, 10),
    days: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
  };
}
export type Report = ReturnType<typeof buildReport>;
