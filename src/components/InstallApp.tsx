import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [instructions, setInstructions] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const before = (e: Event) => { e.preventDefault(); setPrompt(e as InstallEvent); };
    const after = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt",before);
    window.addEventListener("appinstalled",after);
    return () => { window.removeEventListener("beforeinstallprompt",before); window.removeEventListener("appinstalled",after); };
  }, []);
  async function install() {
    if(!prompt) { setInstructions(true); return; }
    try { await prompt.prompt(); await prompt.userChoice; } finally { setPrompt(null); }
  }
  if(installed) return null;
  return <>
    <Button variant="outline" className="mt-3 h-12 w-full" onClick={install}><Download /> Instalar app</Button>
    <Dialog open={instructions} onOpenChange={setInstructions}><DialogContent><DialogHeader><DialogTitle>Adicionar à tela inicial</DialogTitle></DialogHeader><ol className="list-decimal space-y-3 pl-5 text-sm"><li>Abra o endereço publicado do Dora Facilities no Chrome do Android.</li><li>Toque no menu ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”.</li><li>Confirme para criar o ícone no celular.</li></ol><p className="text-sm text-muted-foreground">Sem internet, a tela offline abre após a primeira visita. Cadastros, pedidos e relatórios precisam de conexão.</p></DialogContent></Dialog>
  </>;
}