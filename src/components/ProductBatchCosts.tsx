import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardPen, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl, pct } from "@/lib/format";
import { parseMoney, productMetrics, saleLabel, zeroCostUpdates } from "@/lib/product-rules";
import type { Product } from "@/lib/queries";

export function ProductBatchCosts({ products }: { products: Product[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const zero = products.filter(p => Number(p.cost_price) === 0);
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const visible = zero.filter(p => `${p.name} ${p.category}`.toLocaleLowerCase("pt-BR").includes(term));
  const filled = zero.filter(p => (drafts[p.id] ?? "").trim()).length;

  async function save() {
    let updates: ReturnType<typeof zeroCostUpdates>;
    try { updates = zeroCostUpdates(zero, drafts); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Custo inválido"); return; }
    if (!updates.length) return;
    setBusy(true);
    setSummary("");
    let saved = 0;
    let failed = 0;
    let changed = 0;
    const remaining = { ...drafts };
    try {
      for (const { id, update } of updates) {
        // Never send sale_price; the condition also protects costs changed by another administrator.
        const { data, error } = await supabase.from("products").update(update).eq("id", id).eq("cost_price", 0).select("id");
        if (error) { failed++; continue; }
        if (data?.length) saved++; else changed++;
        delete remaining[id];
      }
      setDrafts(remaining);
      setSummary(`${saved} custos salvos${failed ? ` · ${failed} com falha` : ""}${changed ? ` · ${changed} já alterados ou indisponíveis` : ""}.`);
      if (failed) toast.error("Alguns custos não foram salvos. Tente novamente.");
    } catch {
      setDrafts(remaining);
      setSummary(`${saved} custos salvos. Salvamento interrompido; os demais valores foram mantidos para tentar novamente.`);
      toast.error("Verifique sua conexão e tente novamente.");
    } finally {
      await qc.invalidateQueries({ queryKey: ["products"] });
      setBusy(false);
    }
  }

  return <>
    <Button variant="outline" className="mb-3 h-12 w-full" disabled={!zero.length} onClick={() => { setDrafts({}); setSearch(""); setSummary(""); setOpen(true); }}>
      <ClipboardPen /> Preencher custos zerados ({zero.length})
    </Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" onInteractOutside={e => { if (busy) e.preventDefault(); }} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }}>
        <DialogHeader><DialogTitle>Custos zerados</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar produtos com custo zerado" placeholder="Buscar por nome ou categoria" value={search} onChange={e => setSearch(e.target.value)} className="h-11 pl-9" disabled={busy} />
        </div>
        {summary && <p role="status" className="text-sm font-semibold">{summary}</p>}
        <div className="space-y-3">
          {visible.map(p => {
            const raw = drafts[p.id] ?? "";
            const cost = parseMoney(raw);
            const valid = Number.isFinite(cost) && cost > 0;
            const invalid = raw.trim() !== "" && !valid;
            const metrics = productMetrics(Number(p.sale_price), valid ? cost : 0);
            return <div key={p.id} className="rounded-md border p-3">
              <p className="font-semibold">{p.name}</p>
              {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              <p className="text-xs text-muted-foreground">{p.category || "Sem categoria"} · {saleLabel(p)}</p>
              <div className="mt-2 grid grid-cols-2 items-end gap-3">
                <p className="text-sm">Venda <b className="block">{brl(Number(p.sale_price))}/{saleLabel(p)}</b></p>
                <div className="space-y-1">
                  <Label htmlFor={`batch-cost-${p.id}`}>Custo (R$)</Label>
                  <Input id={`batch-cost-${p.id}`} aria-label={`Custo de ${p.name}`} inputMode="decimal" placeholder="0,00" value={raw} disabled={busy} aria-invalid={invalid} onChange={e => setDrafts(prev => ({ ...prev, [p.id]: e.target.value }))} className="h-11" />
                </div>
              </div>
              {invalid && <p className="mt-1 text-xs text-destructive">Informe um custo maior que zero.</p>}
              {valid && <p className={`mt-2 text-xs ${metrics.profit < 0 ? "text-destructive" : "text-success"}`}>Lucro {brl(metrics.profit)} · Margem {pct(metrics.margin)}</p>}
            </div>;
          })}
          {!visible.length && <p className="py-4 text-center text-muted-foreground">{zero.length ? "Nenhum produto encontrado." : "Nenhum produto com custo zerado."}</p>}
        </div>
        <div className="sticky bottom-0 flex gap-2 border-t bg-background pt-3">
          <Button variant="outline" className="h-12" disabled={busy} onClick={() => setOpen(false)}>Fechar</Button>
          <Button className="h-12 min-w-0 flex-1" disabled={busy || !filled} onClick={save}>{busy ? "Salvando..." : `Salvar custos (${filled})`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}