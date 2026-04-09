import type { SelectHTMLAttributes } from "react";
import { cn } from "@/core/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  erro?: string | null;
};

export function Select({ className, label, erro, id, children, ...props }: SelectProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700" htmlFor={id}>
      {label ? <span>{label}</span> : null}
      <select
        id={id}
        className={cn(
          "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
          erro ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {erro ? <span className="text-xs font-medium text-rose-600">{erro}</span> : null}
    </label>
  );
}
