import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildReport } from "@/lib/report";
import { buildReportPdf } from "@/lib/report-pdf";
import { settingsQuery } from "@/lib/queries";
import { brl, dateBR, pct, qty } from "@/lib/format";
import { downloadBlob, shareFile } from "@/lib/files";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — DoraFacilities APP" }] }),
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

function ReportsPage() {
  const settings = useQuery(settingsQuery);
  const [period, setPeriod] = useState<Period>("7dias");
  const today = toInput(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [start, end] = range(period, from, to);

  const q = useQuery({
    queryKey: ["report", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("created_at,total,total_cost,profit,order_items(product_name,description,unit,quantity,subtotal,subtotal_cost)")
        .eq("status", "finalizado")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const r = useMemo(() => buildReport(q.data ?? []), [q.data]);
  const periodLabel = `${dateBR(start)} a ${dateBR(end)}`;
  const fileName = `relatorio-${toInput(start)}_${toInput(end)}.pdf`;

  async function generate() {
    setBusy(true);
    try {
      setPdf(await buildReportPdf(r, { company: settings.data?.company_name ?? "Dora Facilities", period: periodLabel }));
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
      <p className="mt-2 text-sm text-muted-foreground">{periodLabel} · somente pedidos finalizados</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Kpi label="Pedidos" value={String(r.count)} />
        <Kpi label="Faturamento" value={brl(r.revenue)} />
        <Kpi label="Custo total" value={brl(r.cost)} />
        <Kpi label="Lucro" value={brl(r.profit)} strong />
        <Kpi label="Margem média" value={pct(r.margin)} />
      </div>

      <div className="mt-3 rounded-xl border bg-card p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button size="lg" className="h-12" disabled={busy || q.isLoading} onClick={generate}>
            <FileText /> {busy ? "Gerando..." : "Gerar PDF"}
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

      <Table title="Mais vendidos (faturamento)" head={["Produto", "Qtd", "Valor"]} rows={r.topSold.map((p) => [`${p.name}${p.description ? `\n${p.description}` : ""}`, `${qty(p.quantity)} ${p.unit}`, brl(p.revenue)])} />
      <Table title="Mais lucrativos" head={["Produto", "Qtd", "Lucro"]} rows={r.topProfit.map((p) => [`${p.name}${p.description ? `\n${p.description}` : ""}`, `${qty(p.quantity)} ${p.unit}`, brl(p.profit)])} />
      <Table title="Vendas por dia" head={["Dia", "Pedidos", "Valor"]} rows={r.days.map((d) => [d.day.split("-").reverse().join("/"), String(d.orders), brl(d.revenue)])} />
    </AppShell>
  );
}

function Kpi({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3", strong ? "bg-primary text-primary-foreground" : "bg-card")}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-lg font-extrabold">{value}</p>
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
