import { cn } from "cn"

import { Badge } from "@/components/ui/badge"

type StatusTone = "default" | "success" | "warning" | "destructive"

const toneClasses: Record<StatusTone, string> = {
  default: "",
  success: "border-chart-2/30 bg-chart-2/15 text-chart-2",
  warning: "border-chart-4/30 bg-chart-4/15 text-chart-4",
  destructive: "",
}

type StatusBadgeProps = {
  label: string
  tone?: StatusTone
}

function StatusBadge({ label, tone = "default" }: StatusBadgeProps) {
  return (
    <Badge
      variant={tone === "destructive" ? "destructive" : "outline"}
      className={cn(toneClasses[tone])}
    >
      {label}
    </Badge>
  )
}

export { StatusBadge }
