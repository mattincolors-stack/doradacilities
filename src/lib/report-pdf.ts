import type { Report } from "./report";
import { brl, dateTimeBR, pct, qty } from "./format";

export async function buildReportPdf(r: Report, meta: { company: string; period: string }): Promise<Blob> {
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

  return doc.output("blob");
}
