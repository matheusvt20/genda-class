import { cn } from "@/core/utils";

type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
};

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-2xl bg-white p-1 shadow-soft sm:min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition",
              value === tab.id ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
