import * as React from "react"
import { cn } from "@/lib/utils"

interface ActivityItemProps {
  icon?: React.ReactNode
  iconBg?: string
  title: string
  description?: string
  timestamp: string
  amount?: string
  amountType?: "positive" | "negative" | "neutral"
  badge?: React.ReactNode
  className?: string
}

export function ActivityItem({
  icon,
  iconBg,
  title,
  description,
  timestamp,
  amount,
  amountType = "neutral",
  badge,
  className,
}: ActivityItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50",
        className,
      )}
    >
      {/* Icon */}
      {icon && (
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            iconBg || "bg-sage-100 text-sage-600",
          )}
        >
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {title}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {amount && (
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  amountType === "positive" && "text-sage-600",
                  amountType === "negative" && "text-terracotta",
                  amountType === "neutral" && "text-foreground",
                )}
              >
                {amount}
              </span>
            )}
            {badge}
          </div>
        </div>

        <p className="mt-1 text-[11px] text-muted-foreground">{timestamp}</p>
      </div>
    </div>
  )
}

interface ActivityListProps {
  children: React.ReactNode
  className?: string
}

export function ActivityList({ children, className }: ActivityListProps) {
  return (
    <div className={cn("divide-y divide-border/50", className)}>
      {children}
    </div>
  )
}
