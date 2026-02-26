import { Circle, CheckCircle2, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Session } from "@filegate/sdk";

const STATUS_CONFIG: Record<
  Session["status"],
  {
    label: string;
    variant: "default" | "secondary" | "outline";
    icon: typeof Circle;
    iconClass: string;
  }
> = {
  pending: {
    label: "No llegit",
    variant: "default",
    icon: Circle,
    iconClass: "text-blue-300",
  },
  picked: {
    label: "Llegit",
    variant: "secondary",
    icon: CheckCircle2,
    iconClass: "text-green-400",
  },
  archived: {
    label: "Arxivat",
    variant: "outline",
    icon: Archive,
    iconClass: "text-muted-foreground",
  },
};

export function StatusBadge({ status }: { status: Session["status"] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`size-3 ${config.iconClass}`} />
      {config.label}
    </Badge>
  );
}
