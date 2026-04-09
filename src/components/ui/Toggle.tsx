import { cn } from "@/core/utils";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left"
    >
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {description ? <span className="block text-sm text-slate-500">{description}</span> : null}
      </span>
      <span
        className={cn(
          "relative inline-flex h-7 w-12 rounded-full transition",
          checked ? "bg-brand-600" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </button>
  );
}
