import { cn } from "@/core/utils";

type BadgeProps = {
  children: string;
  tom?: "azul" | "verde" | "laranja" | "cinza" | "rose" | "violeta";
  className?: string;
};

const tons: Record<NonNullable<BadgeProps["tom"]>, string> = {
  azul: "bg-brand-50 text-brand-700 ring-brand-100",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  laranja: "bg-amber-50 text-amber-700 ring-amber-100",
  cinza: "bg-slate-100 text-slate-600 ring-slate-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  violeta: "bg-violet-50 text-violet-700 ring-violet-100",
};

export function Badge({ children, tom = "azul", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        tons[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}
