import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, FileSpreadsheet, FileText, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildReport, variationPct, type ReportOrder } from "@/lib/report";
import { buildReportXlsx } from "@/lib/report-xlsx";
import { buildReportPdf } from "@/lib/report-pdf";
import { productsQuery, settingsQuery } from "@/lib/queries";
import { brl, dateBR, pct, qty } from "@/lib/format";
import { downloadBlob, shareFile } from "@/lib/files";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — DoraFacilities APP" }, { name: "description", content: "Vendas, custos, lucros e relatórios PDF da Dora Facilities." }, { property: "og:title", content: "Relatórios — DoraFacilities APP" }, { property: "og:description", content: "Vendas, custos, lucros e relatórios PDF da Dora Facilities." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ReportsPage,
});

type Period = "hoje" | "7dias" | "mes" | "custom";
const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function range(p: Period, from: string, to: string): [Date, Date] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86400000 - 1);
  if (p === "7dias") return [new Date(start.getTime() - 6 * 86400000), end];
  if (p === "mes") return [new Date(now.getFullYear(), now.getMonth(), 1), end];
  if (p === "custom") return [new Date(`${from}T00:00:00`), new Date(`${to}T23:59:59.999`)];
  return [start, end];
}

const PAGE = 1000;
async function fetchOrders(start: Date, end: Date): Promise<ReportOrder[]> {
  const all: ReportOrder[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("orders")
      .select("id,number,customer_name,created_at,total,total_cost,profit,order_items(product_id,product_name,description,unit,quantity,subtotal,subtotal_cost)")
      .eq("status", "finalizado")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as ReportOrder[]));
    if (data.length < PAGE) return all;
  }
}

const chartConfig = { revenue: { label: "Faturamento", color: "var(--primary)" }, profit: { label: "Lucro", color: "var(--success)" } } satisfies ChartConfig;

function ReportsPage() {
  const navigate = useNavigate();
  const products = useQuery(productsQuery);
  const settings = useQuery(settingsQuery);
  const [period, setPeriod] = useState<Period>("7dias");
  const today = toInput(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [start, end] = range(period, from, to);

  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime() + 1));
  const q = useQuery({ queryKey: ["report", start.toISOString(), end.toISOString()], queryFn: () => fetchOrders(start, end) });
  const pq = useQuery({ queryKey: ["report", prevStart.toISOString(), prevEnd.toISOString()], queryFn: () => fetchOrders(prevStart, prevEnd) });
  const cats = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p.category || "Sem categoria"])), [products.data]);
  const r = useMemo(() => buildReport(q.data ?? [], cats), [q.data, cats]);
  const prev = useMemo(() => buildReport(pq.data ?? [], cats), [pq.data, cats]);
  const [xlsxBusy, setXlsxBusy] = useState(false);
  async function exportXlsx() {
    setXlsxBusy(true);
    try {
      const blob = await buildReportXlsx(r, prev, { company: settings.data?.company_name ?? "Dora Facilities", period: periodLabel });
      downloadBlob(blob, fileName.replace(/\.pdf$/, ".xlsx"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar Excel");
    } finally {
      setXlsxBusy(false);
    }
  }
  const periodLabel = `${dateBR(start)} a ${dateBR(end)}`;
  const fileName = `relatorio-${toInput(start)}_${toInput(end)}.pdf`;

  async function generate() {
    setBusy(true);
    try {
      setPdf(await buildReportPdf(r, { company: settings.data?.company_name ?? "Dora Facilities", period: periodLabel }, prev));
      toast.success("PDF pronto");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
    } finally {
      setBusy(false);
    }
  }

  const choose = (p: Period) => {
    setPeriod(p);
    setPdf(null);
  };

  return (
    <AppShell title="Relatórios">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
        {([["hoje", "Hoje"], ["7dias", "7 dias"], ["mes", "Mês"], ["custom", "Período"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => choose(k)} className={cn("h-10 rounded-lg text-sm font-semibold", period === k ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {l}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPdf(null); }} className="h-11" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPdf(null); }} className="h-11" />
        </div>
      )}
      <p className="mt-2 text-sm text-muted-foreground">{periodLabel} · somente pedidos finalizados · comparado a {dateBR(prevStart)} a {dateBR(prevEnd)}</p>
      {r.zeroCost.length > 0 && (
        <div role="alert" className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-bold text-destructive"><AlertTriangle className="h-5 w-5" /> Produtos vendidos com custo zerado</p>
          <p className="mt-1">O lucro destes itens está superestimado:</p>
          <ul className="mt-1 list-disc pl-5">{r.zeroCost.map((z) => <li key={`${z.name}|${z.unit}|${z.description}`}>{z.name}{z.description ? ` (${z.description})` : ""}</li>)}</ul>
          <Button asChild variant="outline" className="mt-2 h-11"><Link to="/produtos" search={{ custos: true }}>Preencher custos zerados</Link></Button>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Kpi label="Pedidos" value={String(r.count)} delta={variationPct(r.count, prev.count)} isNew={prev.count === 0 && r.count > 0} />
        <Kpi label="Faturamento" value={brl(r.revenue)} delta={variationPct(r.revenue, prev.revenue)} isNew={prev.revenue === 0 && r.revenue > 0} />
        <Kpi label="Custo total" value={brl(r.cost)} delta={variationPct(r.cost, prev.cost)} isNew={prev.cost === 0 && r.cost > 0} inverse />
        <Kpi label="Lucro" value={brl(r.profit)} delta={variationPct(r.profit, prev.profit)} isNew={prev.profit === 0 && r.profit > 0} strong />
        <Kpi label="Margem média" value={pct(r.margin)} delta={prev.count ? r.margin - prev.margin : null} points />
      </div>

      <div className="mt-3 rounded-xl border bg-card p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button size="lg" className="h-12" disabled={busy || q.isLoading || pq.isLoading} onClick={generate}>
            <FileText /> {busy ? "Gerando..." : "Gerar PDF"}
          </Button>
          <Button size="lg" variant="outline" className="h-12" disabled={xlsxBusy || q.isLoading || pq.isLoading} onClick={exportXlsx}>
            <FileSpreadsheet /> {xlsxBusy ? "Gerando..." : "Exportar Excel"}
          </Button>
          {pdf && (
            <>
              <Button size="lg" variant="outline" className="h-12" onClick={() => downloadBlob(pdf, fileName)}>
                <Download /> Baixar
              </Button>
              <Button size="lg" variant="outline" className="h-12" onClick={() => shareFile(pdf, fileName)}>
                <Share2 /> Compartilhar
              </Button>
            </>
          )}
        </div>
      </div>

      {q.error && <p className="mt-3 text-sm text-destructive">Erro ao carregar pedidos.</p>}
      <section className="mt-3 rounded-xl border bg-card p-4">
        <h2 className="mb-2 font-bold">Faturamento e lucro por dia</h2>
        {r.days.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados no período.</p> : (
          <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
            <BarChart data={r.days.map((d) => ({ ...d, label: d.day.slice(8, 10) + "/" + d.day.slice(5, 7) }))}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} width={44} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => `${chartConfig[n as keyof typeof chartConfig]?.label ?? n}: ${brl(Number(v))}`} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
              <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </section>
      <Table title="Por categoria" head={["Categoria", "Fat.", "Custo", "Lucro", "Margem"]} rows={r.categories.map((c) => [c.category, brl(c.revenue), brl(c.cost), brl(c.profit), pct(c.margin)])} />
      <section className="mt-3 rounded-xl border bg-card p-4">
        <h2 className="mb-2 font-bold">Pedidos do período ({r.orders.length})</h2>
        {r.orders.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados no período.</p> : (
          <div className="divide-y">
            {r.orders.map((o) => (
              <button key={o.id} onClick={() => navigate({ to: "/pedidos/$id", params: { id: o.id } })} className="flex w-full items-center gap-2 py-2 text-left text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">#{o.number ?? "—"} · {o.day.split("-").reverse().join("/")}</span>
                  <span className="block truncate text-xs text-muted-foreground">{o.customer || "Sem cliente"}</span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{brl(o.total)}</span>
                  <span className="block text-xs text-muted-foreground">Custo {brl(o.cost)}</span>
                </span>
                <span className="w-24 text-right">
                  <span className={cn("block font-semibold", o.profit < 0 ? "text-destructive" : "text-success")}>{brl(o.profit)}</span>
                  <span className="block text-xs text-muted-foreground">{pct(o.margin)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      <Table title="Mais vendidos (faturamento)" head={["Produto", "Qtd", "Valor"]} rows={r.topSold.map((p) => [`${p.name}${p.description ? `\n${p.description}` : ""}`, `${qty(p.quantity)} ${p.unit}`, brl(p.revenue)])} />
      <Table title="Mais lucrativos" head={["Produto", "Qtd", "Lucro"]} rows={r.topProfit.map((p) => [`${p.name}${p.description ? `\n${p.description}` : ""}`, `${qty(p.quantity)} ${p.unit}`, brl(p.profit)])} />
      <Table title="Vendas por dia" head={["Dia", "Pedidos", "Valor"]} rows={r.days.map((d) => [d.day.split("-").reverse().join("/"), String(d.orders), brl(d.revenue)])} />
    </AppShell>
  );
}

function Kpi({ label, value, strong, delta, inverse, isNew, points }: { label: string; value: string; strong?: boolean; delta: number | null; inverse?: boolean; isNew?: boolean; points?: boolean }) {
  const good = delta !== null && (inverse ? delta < 0 : delta > 0);
  const bad = delta !== null && (inverse ? delta > 0 : delta < 0);
  const text = delta === null ? (isNew ? "novo" : "—") : `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")}${points ? " p.p." : "%"}`;
  return (
    <div className={cn("rounded-xl border p-3", strong ? "bg-primary text-primary-foreground" : "bg-card")}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-lg font-extrabold">{value}</p>
      <p className={cn("text-xs font-semibold", strong ? "" : good ? "text-success" : bad ? "text-destructive" : "text-muted-foreground")}>
        {strong && delta !== null ? (good ? "▲ " : bad ? "▼ " : "") : ""}{text} <span className="font-normal opacity-80">vs anterior</span>
      </p>
    </div>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <section className="mt-3 rounded-xl border bg-card p-4">
      <h2 className="mb-2 font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              {head.map((h, i) => <th key={h} className={cn("pb-1", i > 0 && "text-right")}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {r.map((c, j) => <td key={j} className={cn("py-1.5", j > 0 && "text-right font-medium")}>{j === 0 ? c.split("\n").map((line, n) => <span key={n} className={n > 0 ? "block text-xs text-muted-foreground" : "block"}>{line}</span>) : c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
