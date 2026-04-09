import { cn } from "@/core/utils";

type ProgressBarProps = {
  value: number;
  max: number;
  className?: string;
};

export function ProgressBar({ value, max, className }: ProgressBarProps) {
  const percentual = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className={cn("h-2 rounded-full bg-slate-200", className)}>
      <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${percentual}%` }} />
    </div>
  );
}
