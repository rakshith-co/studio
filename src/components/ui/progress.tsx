"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    orientation?: "horizontal" | "vertical"
  }
>(({ className, value, orientation = "horizontal", ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      "relative overflow-hidden rounded-full bg-secondary",
      orientation === "horizontal" && "h-4 w-full",
      orientation === "vertical" && "h-full w-4",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "flex-1 bg-primary transition-all",
        orientation === "horizontal" && "h-full w-full",
        orientation === "vertical" && "w-full"
        )}
      style={{ 
        transform: orientation === 'horizontal' 
          ? `translateX(-${100 - (value || 0)}%)` 
          : `translateY(${100 - (value || 0)}%)`,
        ...(orientation === 'vertical' && { height: `${value || 0}%`, transform: 'translateY(0)' })
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
