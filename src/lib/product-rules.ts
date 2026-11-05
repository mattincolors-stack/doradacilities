export type SaleType = "Por kg" | "Unitário";
export function zeroCostUpdates(products: { id: string; cost_price: number }[], drafts: Record<string, string>) {
  return products.filter(p => Number(p.cost_price) === 0 && (drafts[p.id] ?? "").trim() !== "").map(p => {
    const cost = parseMoney(drafts[p.id]);
    if (!Number.isFinite(cost) || cost <= 0) throw new Error("Informe custos maiores que zero, como R$ 11,50");
    return { id: p.id, update: { cost_price: cost } };
  });
}
export function parseMoney(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const raw = String(value ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
  if (!raw || !/^-?[\d.,]+$/.test(raw)) return NaN;
  return Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
}
export function productMetrics(sale: number, cost: number, weight?: number | null) {
  const profit = sale - cost;
  return { profit, margin: sale > 0 ? profit / sale * 100 : 0, perKg: weight && weight > 0 ? sale * 1000 / weight : null };
}
export function normalizeText(s: string): string {
  return s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
/** Sugere o produto de uma foto pelo nome do arquivo; null quando nenhum nome combina. */
export function matchProductByFilename(filename: string, products: { id: string; name: string }[]): string | null {
  const base = normalizeText(filename.replace(/\.[^.]+$/, ""));
  if (!base) return null;
  let best: { id: string; len: number } | null = null;
  for (const p of products) {
    const n = normalizeText(p.name);
    if (n && (base.includes(n) || n.includes(base)) && (!best || n.length > best.len)) best = { id: p.id, len: n.length };
  }
  return best ? best.id : null;
}
export function productKey(name: string, category: string) {
  return `${category.trim().toLocaleLowerCase("pt-BR")}|${name.trim().toLocaleLowerCase("pt-BR")}`;
}
export function saleLabel(p: { unit: string; weight_g?: number | null }) {
  return p.unit === "kg" ? "kg" : p.weight_g ? `${String(p.weight_g).replace(".", ",")} g` : "un";
}
export const IMPORT_HEADERS = ["Categoria", "Produto", "Descrição", "Tipo de Venda", "Peso (g)", "Preço de Venda", "Custo", "Lucro", "Margem"];
export type ImportProduct = { name: string; category: string; description: string; sale_type: SaleType; weight_g: number | null; unit: string; sale_price: number; cost_price: number };
export type PreviewRow = { line: number; product: ImportProduct; errors: string[]; existingId?: string | undefined };
export function previewProducts(rows: unknown[][], existing: { id: string; name: string; category: string }[]): PreviewRow[] {
  const known = new Map(existing.map(p => [productKey(p.name, p.category), p.id]));
  const seen = new Set<string>();
  return rows.map((r, index) => {
    const [category, name, description, type, weight, sale, cost] = r;
    const saleType = String(type ?? "").trim();
    const product: ImportProduct = { category: String(category ?? "").trim(), name: String(name ?? "").trim(), description: String(description ?? "").trim(), sale_type: saleType === "Unitário" ? "Unitário" : "Por kg", weight_g: saleType === "Unitário" ? parseMoney(weight) : null, unit: saleType === "Unitário" ? "un" : "kg", sale_price: parseMoney(sale), cost_price: parseMoney(cost) };
    const errors: string[] = [];
    if (!product.name) errors.push("Produto obrigatório");
    if (!["Por kg", "Unitário"].includes(saleType)) errors.push("Tipo de Venda deve ser Por kg ou Unitário");
    if (saleType === "Unitário" && !(Number(product.weight_g) > 0)) errors.push("Peso (g) obrigatório para Unitário");
    if (!Number.isFinite(product.sale_price) || product.sale_price < 0) errors.push("Preço de Venda inválido");
    if (!Number.isFinite(product.cost_price) || product.cost_price < 0) errors.push("Custo inválido");
    const key = productKey(product.name, product.category);
    if (seen.has(key)) errors.push("Produto repetido nesta planilha");
    seen.add(key);
    return { line: index + 2, product, errors, existingId: known.get(key) };
  });
}