import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function StatusPill({
  label,
  tone,
  className
}: {
  label: string;
  tone: "default" | "warm" | "success" | "critical" | "muted";
  className?: string;
}) {
  return (
    <Badge className={cn("capitalize", className)} tone={tone}>
      {label}
    </Badge>
  );
}
