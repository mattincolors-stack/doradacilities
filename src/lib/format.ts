export function brl(n: number): string {
  const v = Math.round(Math.abs(Number(n) || 0) * 100) / 100;
  const [i = "0", d = "00"] = v.toFixed(2).split(".");
  const sign = Number(n) < 0 && v > 0 ? "-" : "";
  return `${sign}R$ ${i.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${d}`;
}

export function qty(n: number): string {
  return String(Number((Number(n) || 0).toFixed(3))).replace(".", ",");
}

export function pct(n: number): string {
  return `${(Number(n) || 0).toFixed(1).replace(".", ",")}%`;
}

export function marginPct(cost: number, sale: number): number {
  return sale > 0 ? ((sale - cost) / sale) * 100 : 0;
}

const dtf = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const df = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function dateTimeBR(iso: string | Date): string {
  return dtf.format(new Date(iso)).replace(",", "");
}
export function dateBR(iso: string | Date): string {
  return df.format(new Date(iso));
}

export function digits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

export const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};
