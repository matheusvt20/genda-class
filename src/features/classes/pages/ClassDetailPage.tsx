import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/feedback/EmptyState";

export function ClassDetailPage() {
  const { id } = useParams();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-600">Detalhe da turma</p>
        <h2 className="text-3xl font-semibold text-slate-900">Turma {id}</h2>
      </div>
      <EmptyState
        titulo="Detalhes da turma"
        descricao="Este espaço vai receber resumo da turma, alunas inscritas, pagamentos e custos."
      />
    </div>
  );
}
