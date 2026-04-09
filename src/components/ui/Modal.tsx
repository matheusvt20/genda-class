import type { PropsWithChildren, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/core/utils";

type ModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}>;

const tamanhos = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export function Modal({ open, onClose, title, description, footer, children, size = "lg" }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6">
      <button type="button" aria-label="Fechar modal" className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#F1F3F7] shadow-soft sm:max-h-[88vh] sm:rounded-[28px]",
          tamanhos[size],
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {description ? <p className="text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}
