import type { HTMLAttributes } from "react";
import { cn } from "@/lib/formatting";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

