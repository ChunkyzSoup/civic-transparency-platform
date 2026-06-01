import type { HTMLAttributes } from "react";
import { cn } from "@/lib/formatting";

type BadgeTone = "neutral" | "low" | "medium" | "high" | "outline";

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "badge",
        tone === "low" && "badge-low",
        tone === "medium" && "badge-medium",
        tone === "high" && "badge-high",
        tone === "outline" && "badge-outline",
        className
      )}
      {...props}
    />
  );
}

