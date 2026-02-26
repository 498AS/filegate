import { Badge } from "@/components/ui/badge";
import type { Session } from "@filegate/sdk";

const variants: Record<Session["status"], "default" | "secondary" | "outline"> =
  {
    pending: "default",
    picked: "secondary",
    archived: "outline",
  };

export function StatusBadge({ status }: { status: Session["status"] }) {
  return <Badge variant={variants[status]}>{status}</Badge>;
}
