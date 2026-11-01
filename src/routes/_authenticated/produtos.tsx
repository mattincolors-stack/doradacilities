import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProductPhoto } from "@/components/ProductPhoto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductImport } from "@/components/ProductImport";
import { parseMoney, productMetrics, saleLabel, type SaleType } from "@/lib/product-rules";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { productsQuery, type Product } from "@/lib/queries";
import { brl, marginPct, pct } from "@/lib/format";
import { resizeImage } from "@/lib/files";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos — DoraFacilities APP" }] }),
  component: ProductsPage,
});

const UNITS = ["kg", "un", "maço", "caixa"] as const;

function ProductsPage() {
  const qc = useQueryClient();
  const products = useQuery(productsQuery);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (products.data ?? []).filter((p) => !s || p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
  }, [products.data, search]);

  async function toggle(p: Product) {
    const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["products"] });
  }
  async function remove(p: Product) {
    if (!confirm(`Excluir "${p.name}"? Pedidos antigos continuam com o histórico.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    if (p.photo_url) await supabase.storage.from("product-photos").remove([p.photo_url]);
    toast.success("Produto excluído");
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <AppShell
      title="Produtos"
      action={
        <Button size="lg" onClick={() => setEditing("new")}>
          <Plus className="h-5 w-5" /> Novo
        </Button>
      }
    >
      <ProductImport />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou categoria" value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 pl-10 text-base" />
      </div>
      <div className="mt-4 space-y-2">
        {products.isLoading && <p className="py-8 text-center text-muted-foreground">Carregando...</p>}
        {products.data?.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Nenhum produto. Toque em “Novo”.</div>
        )}
        {list.map((p) => {
          const profit = Number(p.sale_price) - Number(p.cost_price);
          return (
            <div key={p.id} className={`rounded-xl border bg-card p-3 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex gap-3">
                <ProductPhoto path={p.photo_url} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.name}</p>
                   {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                  <p className="text-xs text-muted-foreground">{p.category || "Sem categoria"} · {p.unit}</p>
                  <p className="mt-1 text-sm">
                    Venda <b>{brl(Number(p.sale_price))}/{saleLabel(p)}</b> · Custo {brl(Number(p.cost_price))}
                  </p>
                  <p className={`text-xs ${profit < 0 ? "text-destructive" : "text-success"}`}>
                    Lucro {brl(profit)}/{p.unit} · Margem {pct(marginPct(Number(p.cost_price), Number(p.sale_price)))}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 border-t pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={p.active} onCheckedChange={() => toggle(p)} /> {p.active ? "Ativo" : "Inativo"}
                </label>
                <Button variant="outline" size="sm" className="ml-auto h-10" onClick={() => setEditing(p)}>
                  <Pencil /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="h-10 text-destructive" onClick={() => remove(p)} aria-label="Excluir">
                  <Trash2 />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {editing && <ProductForm product={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}

function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [saleType, setSaleType] = useState<SaleType>(product?.unit === "kg" || !product ? "Por kg" : "Unitário");
  const [weight, setWeight] = useState(String(product?.weight_g ?? ""));
  const [cost, setCost] = useState(String(product?.cost_price ?? ""));
  const [sale, setSale] = useState(String(product?.sale_price ?? ""));
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const c = parseMoney(cost);
  const s = parseMoney(sale);
  const grams = parseMoney(weight);
  const metrics = productMetrics(Number.isFinite(s) ? s : 0, Number.isFinite(c) ? c : 0, saleType === "Unitário" ? grams : null);

  async function onFile(f?: File) {
    if (!f) return;
    try {
      const blob = await resizeImage(f, 800);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      toast.error("Não foi possível ler a imagem");
    }
  }

  async function save() {
    if (!name.trim()) { toast.error("Informe o nome"); return; }
    if (!Number.isFinite(c) || c < 0 || !Number.isFinite(s) || s < 0) { toast.error("Informe preços válidos, como R$ 11,50"); return; }
    if (saleType === "Unitário" && !(grams > 0)) { toast.error("Informe o peso em gramas para o item unitário"); return; }
    setBusy(true);
    try {
      let photo_url = product?.photo_url ?? null;
      if (photo) {
        const path = `${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("product-photos").upload(path, photo, { contentType: "image/jpeg" });
        if (error) throw error;
        if (product?.photo_url) await supabase.storage.from("product-photos").remove([product.photo_url]);
        photo_url = path;
      }
      const row = { name: name.trim(), description: description.trim(), category: category.trim(), unit: saleType === "Por kg" ? "kg" : "un", sale_type: saleType, weight_g: saleType === "Unitário" ? grams : null, cost_price: c, sale_price: s, photo_url };
      const { error } = product
        ? await supabase.from("products").update(row).eq("id", product.id)
        : await supabase.from("products").insert(row);
      if (error) throw error;
      toast.success("Produto salvo");
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="" className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <ProductPhoto path={product?.photo_url} className="h-20 w-20" />
            )}
            <div className="grid flex-1 gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => camRef.current?.click()}>
                <Camera /> Câmera
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => galRef.current?.click()}>
                <ImageIcon /> Galeria
              </Button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <input ref={galRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pn">Nome</Label>
            <Input id="pn" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd">Descrição (opcional)</Label>
            <Textarea id="pd" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc">Categoria</Label>
              <Input id="pc" value={category} onChange={(e) => setCategory(e.target.value)} className="h-12 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pu">Tipo de venda</Label>
              <select id="pu" value={saleType} onChange={(e) => setSaleType(e.target.value === "Unitário" ? "Unitário" : "Por kg")} className="h-12 w-full rounded-md border border-input bg-card px-3 text-base">
                <option>Por kg</option><option>Unitário</option>
              </select>
            </div>
            {saleType === "Unitário" && <div className="col-span-2 space-y-1.5"><Label htmlFor="pw">Peso/quantidade em gramas</Label><Input id="pw" required inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} className="h-12 text-base" /></div>}
            <div className="space-y-1.5">
              <Label htmlFor="pcost">Custo de Produção (R$)</Label>
              <Input id="pcost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className="h-12 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="psale">Preço de venda (R$)</Label>
              <Input id="psale" inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value)} className="h-12 text-base" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 text-sm">
            <p>Lucro: <b className={metrics.profit < 0 ? "text-destructive" : "text-success"}>{brl(metrics.profit)}</b></p>
            <p>Margem: <b className={metrics.margin < 0 ? "text-destructive" : "text-success"}>{pct(metrics.margin)}</b></p>
            {metrics.perKg !== null && <p className="col-span-2">Preço por kg equivalente: <b>{brl(metrics.perKg)}/kg</b></p>}
          </div>
          <Button className="h-12 w-full text-base" disabled={busy} onClick={save}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
