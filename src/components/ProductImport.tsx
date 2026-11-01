import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadBlob } from "@/lib/files";
import { IMPORT_HEADERS, previewProducts, productKey, type PreviewRow } from "@/lib/product-rules";

export function ProductImport() {
  const input = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  async function template() {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Produtos");
      sheet.addRow(IMPORT_HEADERS);
      sheet.columns.forEach((c, i) => { c.width = i === 2 ? 40 : 22; });
      sheet.getRow(1).font = { name: "Arial", bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = "A1:I1";
      downloadBlob(new Blob([await workbook.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "modelo-produtos.xlsx");
    } catch { toast.error("Não foi possível baixar o modelo"); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setSummary(null);
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Selecione uma planilha .xlsx");
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("Planilha sem abas");
      const headers = sheet.getRow(1);
      if (!IMPORT_HEADERS.every((h, i) => headers.getCell(i + 1).text.trim() === h)) throw new Error("As colunas devem seguir o modelo de importação");
      const values: unknown[][] = [];
      for (let n = 2; n <= sheet.rowCount; n++) {
        const row = sheet.getRow(n);
        const cells = IMPORT_HEADERS.map((_, i) => { const c = row.getCell(i + 1); return typeof c.value === "number" ? c.value : c.text; });
        if (cells.every(v => String(v).trim() === "")) { values.push([]); continue; }
        values.push(cells);
      }
      const { data, error } = await supabase.from("products").select("id,name,category");
      if (error) throw error;
      const preview = previewProducts(values, data ?? []).filter((_, i) => values[i]?.length);
      if (!preview.length) throw new Error("Nenhum produto na primeira aba");
      setRows(preview);
    } catch(e) { toast.error(e instanceof Error ? e.message : "Não foi possível ler a planilha"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function confirm() {
    if (!rows) return;
    setBusy(true);
    let created = 0, updated = 0, errors = rows.filter(r => r.errors.length).length;
    try {
      const { data, error } = await supabase.from("products").select("id,name,category");
      if (error) throw error;
      const known = new Map((data ?? []).map(p => [productKey(p.name,p.category), p.id]));
      const failed: PreviewRow[] = [];
      for (const r of rows.filter(r => !r.errors.length)) {
        const id = known.get(productKey(r.product.name, r.product.category));
        const result = id ? await supabase.from("products").update(r.product).eq("id",id).select("id").single() : await supabase.from("products").insert(r.product).select("id").single();
        if (result.error) { errors++; failed.push({ ...r, errors: ["Falha ao salvar: " + result.error.message] }); }
        else { if (id) updated++; else created++; if(result.data) known.set(productKey(r.product.name,r.product.category),result.data.id); }
      }
      setSummary(`${created} criados, ${updated} atualizados, ${errors} com erro.`);
      setRows([...rows.filter(r => r.errors.length), ...failed]);
      await qc.invalidateQueries({ queryKey: ["products"] });
    } catch { toast.error("Importação interrompida. Verifique sua conexão."); }
    finally { setBusy(false); }
  }
  return <>
    <div className="my-3 grid grid-cols-2 gap-2">
      <Button variant="outline" className="h-12" onClick={template} disabled={busy}><Download /> Modelo .xlsx</Button>
      <Button variant="outline" className="h-12" onClick={() => input.current?.click()} disabled={busy}><Upload /> {busy ? "Aguarde..." : "Importar .xlsx"}</Button>
      <input ref={input} hidden type="file" accept=".xlsx" onChange={e => upload(e.target.files?.[0])} />
    </div>
    <Dialog open={rows !== null} onOpenChange={open => { if(!open && !busy) {setRows(null);setSummary(null);} }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{summary ? "Resultado da importação" : "Prévia da importação"}</DialogTitle></DialogHeader>
        {summary ? <p role="status" className="font-semibold">{summary}</p> : <p className="text-sm">{rows?.filter(r => !r.errors.length).length} válidas · {rows?.filter(r => r.errors.length).length} com erro · {rows?.filter(r => r.existingId && !r.errors.length).length} já existentes</p>}
        <div className="space-y-2">{rows?.map(r => <div key={r.line} className="rounded-md border p-3 text-sm"><p className="font-semibold">Linha {r.line} · {r.product.name || "Sem nome"}</p><p className="text-muted-foreground">{r.product.category || "Sem categoria"} · {r.product.sale_type}</p><p className={r.errors.length ? "text-destructive" : "text-success"}>{r.errors.length ? r.errors.join("; ") : r.existingId ? "Será atualizado" : "Será criado"}</p></div>)}</div>
        {!summary && <Button className="h-12" disabled={busy || !rows?.some(r => !r.errors.length)} onClick={confirm}>{busy ? "Importando..." : "Confirmar importação"}</Button>}
      </DialogContent>
    </Dialog>
  </>;
}