import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        status === "finalizado" && "bg-success text-success-foreground",
        status === "aberto" && "bg-warning text-warning-foreground",
        status === "cancelado" && "bg-muted text-muted-foreground line-through",
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

const WA: Record<string, string> = { enviado: "WhatsApp enviado", falhou: "WhatsApp falhou", pendente: "WhatsApp pendente" };

export function WhatsBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
        status === "enviado" && "border-success text-success",
        status === "falhou" && "border-destructive text-destructive",
        status === "pendente" && "text-muted-foreground",
      )}
    >
      {WA[status] ?? status}
    </span>
  );
}
