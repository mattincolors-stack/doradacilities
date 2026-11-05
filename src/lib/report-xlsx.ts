import { variationPct, type Report } from "./report";

const money = (n: number) => Math.round(Number(n) * 100) / 100;
const oneDec = (n: number) => Math.round(Number(n) * 10) / 10;
const varCell = (c: number, p: number) => {
  const v = variationPct(c, p);
  return v === null ? "—" : oneDec(v);
};
const dayBR = (day: string) => day.split("-").reverse().join("/");

export async function buildReportXlsx(r: Report, prev: Report, meta: { company: string; period: string }): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  const resumo = wb.addWorksheet("Resumo");
  resumo.addRow([meta.company]);
  resumo.addRow([`Período: ${meta.period}`]);
  resumo.addRow([]);
  resumo.addRow(["Indicador", "Período atual", "Período anterior", "Variação (%)"]);
  resumo.addRow(["Pedidos", r.count, prev.count, varCell(r.count, prev.count)]);
  resumo.addRow(["Faturamento (R$)", money(r.revenue), money(prev.revenue), varCell(r.revenue, prev.revenue)]);
  resumo.addRow(["Custo total (R$)", money(r.cost), money(prev.cost), varCell(r.cost, prev.cost)]);
  resumo.addRow(["Lucro (R$)", money(r.profit), money(prev.profit), varCell(r.profit, prev.profit)]);
  resumo.addRow(["Margem média (%)", oneDec(r.margin), oneDec(prev.margin), "—"]);
  resumo.getRow(1).font = { bold: true, size: 14 };
  resumo.getRow(4).font = { bold: true };

  const prod = wb.addWorksheet("Por produto");
  prod.addRow(["Produto", "Descrição", "Unidade", "Quantidade", "Faturamento (R$)", "Lucro (R$)"]);
  for (const p of r.allProducts) prod.addRow([p.name, p.description, p.unit, p.quantity, money(p.revenue), money(p.profit)]);

  const cat = wb.addWorksheet("Por categoria");
  cat.addRow(["Categoria", "Faturamento (R$)", "Custo (R$)", "Lucro (R$)", "Margem (%)"]);
  for (const c of r.categories) cat.addRow([c.category, money(c.revenue), money(c.cost), money(c.profit), oneDec(c.margin)]);

  const dia = wb.addWorksheet("Por dia");
  dia.addRow(["Dia", "Pedidos", "Faturamento (R$)", "Lucro (R$)"]);
  for (const d of r.days) dia.addRow([dayBR(d.day), d.orders, money(d.revenue), money(d.profit)]);

  const ped = wb.addWorksheet("Pedidos");
  ped.addRow(["Data", "Nº", "Cliente", "Total (R$)", "Custo (R$)", "Lucro (R$)", "Margem (%)"]);
  for (const o of r.orders) ped.addRow([dayBR(o.day), o.number ?? "", o.customer, money(o.total), money(o.cost), money(o.profit), oneDec(o.margin)]);

  for (const s of [prod, cat, dia, ped]) s.getRow(1).font = { bold: true };
  for (const s of [resumo, prod, cat, dia, ped]) s.columns.forEach((c) => { c.width = 20; });

  return new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
