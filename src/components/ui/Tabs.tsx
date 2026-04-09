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
    <div className="max-w-full overflow-x-auto overscroll-x-contain pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-full w-max flex-nowrap gap-2 rounded-2xl bg-white p-1 shadow-soft">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "min-h-11 shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition",
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
