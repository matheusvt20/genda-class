import { DashboardStats } from "@/features/dashboard/components/DashboardStats";
import { Card } from "@/components/ui/Card";

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-brand-600">Dashboard</p>
        <h2 className="text-3xl font-semibold text-slate-900">Visão geral da operação</h2>
        <p className="text-sm text-slate-500">
          Esta fase já deixa o painel pronto para receber os indicadores das próximas entregas.
        </p>
      </div>

      <DashboardStats />

      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Próximos módulos</h3>
        <p className="mt-2 text-sm text-slate-500">
          Turmas, alunas, financeiro e configurações já estão roteados e prontos para ganhar conteúdo.
        </p>
      </Card>
    </div>
  );
}
