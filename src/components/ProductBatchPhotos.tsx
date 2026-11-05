import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Images } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resizeImage } from "@/lib/files";
import { matchProductByFilename } from "@/lib/product-rules";
import type { Product } from "@/lib/queries";

type Entry = { file: File; url: string; productId: string | null; done: boolean };

export function ProductBatchPhotos({ products }: { products: Product[] }) {
  const input = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  function pick(files: FileList | null) {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!list.length) { toast.error("Selecione imagens da galeria"); return; }
    setSummary(null);
    setEntries(list.map((file) => ({ file, url: URL.createObjectURL(file), productId: matchProductByFilename(file.name, products), done: false })));
  }

  function close() {
    if (busy) return;
    entries?.forEach((e) => URL.revokeObjectURL(e.url));
    setEntries(null);
    setSummary(null);
    if (input.current) input.current.value = "";
  }

  async function save() {
    const targets = (entries ?? []).filter((e) => e.productId && !e.done);
    if (!targets.length) return;
    setBusy(true);
    let sent = 0;
    let failed = 0;
    for (const e of targets) {
      try {
        const blob = await resizeImage(e.file, 800);
        const path = `${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("product-photos").upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const product = products.find((p) => p.id === e.productId);
        const { error: updErr } = await supabase.from("products").update({ photo_url: path }).eq("id", e.productId!);
        if (updErr) throw updErr;
        if (product?.photo_url) await supabase.storage.from("product-photos").remove([product.photo_url]);
        sent++;
        setEntries((prev) => prev?.map((x) => (x === e ? { ...x, done: true } : x)) ?? null);
      } catch {
        failed++;
      }
    }
    setBusy(false);
    setSummary(`${sent} fotos enviadas${failed ? ` · ${failed} com falha` : ""}.`);
    if (failed) toast.error("Algumas fotos não foram enviadas. Tente novamente.");
    await qc.invalidateQueries({ queryKey: ["products"] });
  }

  const pending = (entries ?? []).filter((e) => e.productId && !e.done).length;
  return (
    <>
      <Button variant="outline" className="mb-3 h-12 w-full" onClick={() => input.current?.click()}>
        <Images /> Enviar fotos em lote
      </Button>
      <input ref={input} hidden type="file" accept="image/*" multiple onChange={(e) => pick(e.target.files)} />
      <Dialog open={entries !== null} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{summary ? "Resultado do envio" : "Enviar fotos em lote"}</DialogTitle>
          </DialogHeader>
          {summary && <p role="status" className="text-sm font-semibold">{summary}</p>}
          <div className="space-y-3">
            {entries?.map((e, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-md border p-3 ${e.done ? "opacity-60" : ""}`}>
                <img src={e.url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground">{e.file.name}</p>
                  <select
                    aria-label={`Produto da foto ${e.file.name}`}
                    value={e.productId ?? ""}
                    disabled={busy || e.done}
                    onChange={(ev) => setEntries((prev) => prev?.map((x, j) => (j === i ? { ...x, productId: ev.target.value || null } : x)) ?? null)}
                    className="mt-1 h-11 w-full rounded-md border border-input bg-card px-2 text-sm"
                  >
                    <option value="">Escolher produto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.category ? ` · ${p.category}` : ""}</option>
                    ))}
                  </select>
                  {e.done && <p className="mt-1 text-xs text-success">Enviada</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 flex gap-2 border-t bg-background pt-3">
            <Button variant="outline" className="h-12" disabled={busy} onClick={close}>{summary ? "Concluir" : "Cancelar"}</Button>
            {!summary && (
              <Button className="h-12 min-w-0 flex-1" disabled={busy || !pending} onClick={save}>
                {busy ? "Enviando..." : `Enviar fotos (${pending})`}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
