import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/core/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primaria" | "secundaria" | "fantasma";
};

const variantes: Record<NonNullable<ButtonProps["variante"]>, string> = {
  primaria:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500",
  secundaria:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300",
  fantasma:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300",
};

export function Button({
  className,
  variante = "primaria",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variantes[variante],
        className,
      )}
      {...props}
    />
  );
}
