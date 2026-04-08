import { EmptyState } from "@/components/feedback/EmptyState";

export function FinancePage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-600">Financeiro</p>
        <h2 className="text-3xl font-semibold text-slate-900">Recebimentos e custos</h2>
      </div>
      <EmptyState
        titulo="Financeiro inicial"
        descricao="A estrutura do módulo já está pronta para receber pagamentos, custos e resultado das turmas."
      />
    </div>
  );
}
