import * as React from "react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string
  sublabel?: string
  icon?: React.ReactNode
  trend?: {
    value: string
    positive: boolean
  }
  variant?: "default" | "highlight" | "accent" | "urgent"
  className?: string
}

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 transition-all",
        variant === "default" &&
          "border-border bg-card shadow-warm-sm hover:shadow-warm-md",
        variant === "highlight" &&
          "border-sage-200 bg-sage-50 shadow-warm-sm hover:shadow-warm-md",
        variant === "accent" &&
          "border-sand-200 bg-sand-50 shadow-warm-sm hover:shadow-warm-md",
        variant === "urgent" &&
          "border-terracotta/30 bg-terracotta/5 shadow-warm-sm hover:shadow-warm-md",
        className,
      )}
    >
      {/* Subtle decorative gradient in corner */}
      <div
        className={cn(
          "absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.07]",
          variant === "default" && "bg-sage-500",
          variant === "highlight" && "bg-sage-400",
          variant === "accent" && "bg-gold",
          variant === "urgent" && "bg-terracotta",
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-2xl font-bold tracking-tight",
              variant === "urgent" ? "text-terracotta" : "text-foreground",
            )}
          >
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.positive ? "text-sage-600" : "text-terracotta",
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}
              </span>
              <svg
                className={cn(
                  "h-3 w-3",
                  trend.positive
                    ? "text-sage-600"
                    : "rotate-180 text-terracotta",
                )}
                viewBox="0 0 12 12"
                fill="none"
              >
                <path
                  d="M6 2L10 7H2L6 2Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          )}
        </div>

        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              variant === "default" && "bg-sage-100 text-sage-600",
              variant === "highlight" && "bg-sage-200 text-sage-700",
              variant === "accent" && "bg-sand-200 text-sand-400",
              variant === "urgent" && "bg-terracotta/10 text-terracotta",
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
