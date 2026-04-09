import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/core/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  erro?: string | null;
};

export function Textarea({ className, label, erro, id, ...props }: TextareaProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700" htmlFor={id}>
      {label ? <span>{label}</span> : null}
      <textarea
        id={id}
        className={cn(
          "min-h-28 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
          erro ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "",
          className,
        )}
        {...props}
      />
      {erro ? <span className="text-xs font-medium text-rose-600">{erro}</span> : null}
    </label>
  );
}
