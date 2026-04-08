import type { PropsWithChildren } from "react";
import { cn } from "@/core/utils";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-3xl border border-slate-200 bg-white p-6 shadow-soft", className)}>
      {children}
    </div>
  );
}
