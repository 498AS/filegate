import { Circle, CheckCircle2, Archive } from "lucide-react";
import type { Session } from "@filegate/sdk";

const STATUS_CONFIG: Record<
  Session["status"],
  {
    label: string;
    icon: typeof Circle;
    bg: string;
    text: string;
    iconColor: string;
  }
> = {
  pending: {
    label: "No llegit",
    icon: Circle,
    bg: "bg-blue-50",
    text: "text-blue-600",
    iconColor: "text-blue-400",
  },
  picked: {
    label: "Llegit",
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    iconColor: "text-emerald-400",
  },
  archived: {
    label: "Arxivat",
    icon: Archive,
    bg: "bg-slate-100",
    text: "text-slate-500",
    iconColor: "text-slate-400",
  },
};

export function StatusBadge({ status }: { status: Session["status"] }) {
  const c = STATUS_CONFIG[status];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}
    >
      <Icon className={`size-3 ${c.iconColor}`} />
      {c.label}
    </span>
  );
}
