import { variationPct, type Report } from "./report";
import { brl, dateTimeBR, pct, qty } from "./format";

const varLabel = (c: number, p: number) => {
  const v = variationPct(c, p);
  return v === null ? "—" : `${v > 0 ? "+" : ""}${pct(v)}`;
};

export async function buildReportPdf(r: Report, meta: { company: string; period: string }, prev?: Report): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const green: [number, number, number] = [31, 79, 76];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(meta.company, 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Relatório de vendas", 14, 25);
  doc.text(`Período: ${meta.period}`, 14, 31);
  doc.text(`Emitido em: ${dateTimeBR(new Date())}`, 14, 37);

  const opts = { headStyles: { fillColor: green }, styles: { fontSize: 10 }, margin: { left: 14, right: 14 } };
  const next = () => ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? 40) + 10;
  const title = (t: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(t, 14, y);
    doc.setFont("helvetica", "normal");
  };

  autoTable(doc, {
    ...opts,
    startY: 44,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de pedidos", String(r.count)],
      ["Faturamento", brl(r.revenue)],
      ["Custo total", brl(r.cost)],
      ["Lucro", brl(r.profit)],
      ["Margem média", pct(r.margin)],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  let y = next();
  if (r.zeroCost.length) {
    doc.setTextColor(180, 30, 30);
    title("Atenção: produtos vendidos com custo zerado", y);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(`O lucro destes itens está superestimado: ${r.zeroCost.map((z) => z.name + (z.description ? ` (${z.description})` : "")).join(", ")}.`, 182);
    doc.text(lines, 14, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 10 + lines.length * 4;
  }
  if (prev) {
    title("Comparação com o período anterior", y);
    autoTable(doc, {
      ...opts,
      startY: y + 3,
      head: [["Indicador", "Atual", "Anterior", "Variação"]],
      body: [
        ["Pedidos", String(r.count), String(prev.count), varLabel(r.count, prev.count)],
        ["Faturamento", brl(r.revenue), brl(prev.revenue), varLabel(r.revenue, prev.revenue)],
        ["Custo total", brl(r.cost), brl(prev.cost), varLabel(r.cost, prev.cost)],
        ["Lucro", brl(r.profit), brl(prev.profit), varLabel(r.profit, prev.profit)],
        ["Margem média", pct(r.margin), pct(prev.margin), `${(r.margin - prev.margin).toFixed(1).replace(".", ",")} p.p.`],
      ],
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });
    y = next();
  }

  title("Lucro e margem por categoria", y);
  autoTable(doc, {
    ...opts,
    startY: y + 3,
    head: [["Categoria", "Faturamento", "Lucro", "Margem"]],
    body: r.categories.map((c) => [c.category, brl(c.revenue), brl(c.profit), pct(c.margin)]),
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  y = next();
  title("Produtos mais vendidos (por faturamento)", y);
  autoTable(doc, {
    ...opts,
    startY: y + 3,
    head: [["#", "Produto", "Qtd", "Faturamento"]],
    body: r.topSold.map((p, i) => [String(i + 1), `${p.name}${p.description ? `\n${p.description}` : ""}`, `${qty(p.quantity)} ${p.unit}`, brl(p.revenue)]),
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
  });

  y = next();
  title("Produtos mais lucrativos", y);
  autoTable(doc, {
    ...opts,
    startY: y + 3,
    head: [["#", "Produto", "Qtd", "Lucro"]],
    body: r.topProfit.map((p, i) => [String(i + 1), `${p.name}${p.description ? `\n${p.description}` : ""}`, `${qty(p.quantity)} ${p.unit}`, brl(p.profit)]),
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
  });

  y = next();
  title("Vendas por dia", y);
  autoTable(doc, {
    ...opts,
    startY: y + 3,
    head: [["Dia", "Pedidos", "Faturamento", "Lucro"]],
    body: r.days.map((d) => [d.day.split("-").reverse().join("/"), String(d.orders), brl(d.revenue), brl(d.profit)]),
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  y = next();
  title("Pedidos do período", y);
  autoTable(doc, {
    ...opts,
    startY: y + 3,
    head: [["Nº", "Data", "Cliente", "Total", "Custo", "Lucro", "Margem"]],
    body: r.orders.map((o) => [String(o.number ?? ""), o.day.split("-").reverse().join("/"), o.customer, brl(o.total), brl(o.cost), brl(o.profit), pct(o.margin)]),
    styles: { fontSize: 8 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
  });

  return doc.output("blob");
}
