import { EmptyState } from "@/components/feedback/EmptyState";

export function ClassesPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-600">Turmas</p>
        <h2 className="text-3xl font-semibold text-slate-900">Gestão de turmas</h2>
      </div>
      <EmptyState
        titulo="Página pronta para evoluir"
        descricao="Aqui entraremos com o CRUD de turmas, vagas, datas e detalhes do curso."
      />
    </div>
  );
}
