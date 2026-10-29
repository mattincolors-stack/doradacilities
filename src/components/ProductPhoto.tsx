import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function ProductPhoto({ path, className }: { path?: string | null; className?: string }) {
  const q = useQuery({
    queryKey: ["photo", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("product-photos").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!path || !q.data)
    return (
      <div className={cn("flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground", className)}>
        <Package className="h-1/2 w-1/2" strokeWidth={1.5} />
      </div>
    );
  return <img src={q.data} alt="" className={cn("shrink-0 rounded-lg object-cover", className)} />;
}
