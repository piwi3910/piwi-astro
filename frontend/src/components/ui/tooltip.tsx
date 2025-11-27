"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simplified tooltip implementation that doesn't rely on Radix during SSR
// Uses a combination of CSS hover and client-side rendering

interface TooltipProviderProps {
  delayDuration?: number
  children?: React.ReactNode
}

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

interface TooltipProps {
  children?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function Tooltip({ children }: TooltipProps) {
  return <div className="relative inline-flex">{children}</div>
}

interface TooltipTriggerProps {
  children?: React.ReactNode
  asChild?: boolean
  className?: string
}

function TooltipTrigger({
  children,
  className,
  asChild,
  ...props
}: TooltipTriggerProps & React.HTMLAttributes<HTMLElement>) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
      className: cn("group", (children as React.ReactElement<{ className?: string }>).props.className, className),
      ...props,
    })
  }

  return (
    <span className={cn("group", className)} {...props}>
      {children}
    </span>
  )
}

interface TooltipContentProps {
  className?: string
  sideOffset?: number
  children?: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  hidden?: boolean
}

function TooltipContent({
  className,
  children,
  hidden,
  side = "top",
  sideOffset = 4,
}: TooltipContentProps) {
  if (hidden) return null

  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  }

  return (
    <span
      className={cn(
        "absolute z-50 hidden group-hover:block",
        "bg-foreground text-background",
        "rounded-md px-3 py-1.5 text-xs whitespace-nowrap",
        "animate-in fade-in-0 zoom-in-95",
        sideClasses[side],
        className
      )}
      style={{ marginBottom: side === "top" ? sideOffset : undefined }}
    >
      {children}
    </span>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
