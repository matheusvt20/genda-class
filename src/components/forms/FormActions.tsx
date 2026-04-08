import type { PropsWithChildren } from "react";

export function FormActions({ children }: PropsWithChildren) {
  return <div className="flex flex-col gap-3 pt-2">{children}</div>;
}
