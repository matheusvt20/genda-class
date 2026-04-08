import { EmptyState } from "@/components/feedback/EmptyState";

export function StudentsPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-600">Alunas</p>
        <h2 className="text-3xl font-semibold text-slate-900">Cadastro de alunas</h2>
      </div>
      <EmptyState
        titulo="Base preparada"
        descricao="Aqui vamos organizar a lista de alunas, contatos, observações e histórico por turma."
      />
    </div>
  );
}
